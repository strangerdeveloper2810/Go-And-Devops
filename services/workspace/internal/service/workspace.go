package service

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/pm-platform/workspace/internal/model"
	"github.com/pm-platform/workspace/internal/repository"
)

// Sentinel errors — handler map sang HTTP status tương ứng.
// Dùng errors.Is để so khớp, không so sánh chuỗi.
var (
	ErrNotFound  = errors.New("not found")               // 404
	ErrNotMember = errors.New("not a workspace member")  // 403
	ErrNotOwner  = errors.New("not the workspace owner") // 403
	ErrConflict  = errors.New("conflict")                // 409
)

// WorkspaceService: business logic + phân quyền (authz) cho domain workspace.
// Giữ *sql.DB để chạy multi-step create trong 1 transaction (atomic).
type WorkspaceService interface {
	CreateWorkspace(ctx context.Context, ownerID int64, name string) (*model.Workspace, error)
	ListMyWorkspaces(ctx context.Context, userID int64) ([]*model.Workspace, error)
	GetWorkspace(ctx context.Context, userID, id int64) (*model.Workspace, error)
	// GetWorkspaceByID: lấy workspace theo id KHÔNG check membership.
	// Dùng cho gRPC nội bộ (caller là service khác đã được tin cậy, không có user context).
	GetWorkspaceByID(ctx context.Context, id int64) (*model.Workspace, error)
	UpdateWorkspace(ctx context.Context, userID, id int64, name, plan string) (*model.Workspace, error)
	DeleteWorkspace(ctx context.Context, userID, id int64) error

	AddMember(ctx context.Context, actorID, wsID, targetUserID int64, roleName string) (*model.Member, error)
	ListMembers(ctx context.Context, userID, wsID int64) ([]*model.Member, error)
	RemoveMember(ctx context.Context, actorID, wsID, targetUserID int64) error

	CreateProject(ctx context.Context, userID, wsID int64, key, name string) (*model.Project, error)
	ListProjects(ctx context.Context, userID, wsID int64) ([]*model.Project, error)

	ListRoles(ctx context.Context, userID, wsID int64) ([]*model.Role, error)

	CheckMembership(ctx context.Context, wsID, userID int64) (bool, string, error)
	EnsureUserAndDefaultWorkspace(ctx context.Context, userID int64, email, name, avatar string) error
}

type workspaceService struct {
	db          *sql.DB
	wsRepo      repository.WorkspaceRepository
	memberRepo  repository.MemberRepository
	projectRepo repository.ProjectRepository
	roleRepo    repository.RoleRepository
	userRepo    repository.UserRepository
}

func NewWorkspaceService(
	db *sql.DB,
	wsRepo repository.WorkspaceRepository,
	memberRepo repository.MemberRepository,
	projectRepo repository.ProjectRepository,
	roleRepo repository.RoleRepository,
	userRepo repository.UserRepository,
) WorkspaceService {
	return &workspaceService{
		db:          db,
		wsRepo:      wsRepo,
		memberRepo:  memberRepo,
		projectRepo: projectRepo,
		roleRepo:    roleRepo,
		userRepo:    userRepo,
	}
}

// ---- Workspace ----

func (s *workspaceService) CreateWorkspace(ctx context.Context, ownerID int64, name string) (*model.Workspace, error) {
	// Sinh slug từ name (lowercase + hyphen). Nếu trùng thì gắn thêm hậu tố ngắn.
	base := slugify(name)
	slug := base
	for i := 0; i < 5; i++ {
		// Dedupe theo workspace CÒN SỐNG (slugTaken bỏ qua row đã soft-delete),
		// khớp partial unique index WHERE deleted_at IS NULL → slug đã xoá mềm được
		// tái sử dụng thay vì phải gắn hậu tố thừa.
		taken, err := s.slugTaken(ctx, slug)
		if err != nil {
			return nil, err
		}
		if !taken {
			break // slug trống → dùng được
		}
		slug = base + "-" + randSuffix()
	}

	// Insert workspace + gán owner làm member (role 'owner') trong 1 transaction.
	return s.createWorkspaceTx(ctx, ownerID, slug, name)
}

func (s *workspaceService) ListMyWorkspaces(ctx context.Context, userID int64) ([]*model.Workspace, error) {
	return s.wsRepo.ListByMember(ctx, userID)
}

func (s *workspaceService) GetWorkspace(ctx context.Context, userID, id int64) (*model.Workspace, error) {
	// Phải là thành viên mới được xem.
	if _, err := s.assertMember(ctx, id, userID); err != nil {
		return nil, err
	}
	ws, err := s.wsRepo.GetByID(ctx, id)
	if err != nil {
		return nil, mapNotFound(err)
	}
	return ws, nil
}

func (s *workspaceService) GetWorkspaceByID(ctx context.Context, id int64) (*model.Workspace, error) {
	ws, err := s.wsRepo.GetByID(ctx, id)
	if err != nil {
		return nil, mapNotFound(err)
	}
	return ws, nil
}

func (s *workspaceService) UpdateWorkspace(ctx context.Context, userID, id int64, name, plan string) (*model.Workspace, error) {
	// Chỉ owner được sửa.
	if err := s.assertOwner(ctx, id, userID); err != nil {
		return nil, err
	}
	ws, err := s.wsRepo.GetByID(ctx, id)
	if err != nil {
		return nil, mapNotFound(err)
	}
	// Chỉ ghi đè field được truyền (rỗng = giữ nguyên).
	if name != "" {
		ws.Name = name
	}
	if plan != "" {
		ws.Plan = plan
	}
	if err := s.wsRepo.Update(ctx, ws); err != nil {
		return nil, mapNotFound(err)
	}
	return ws, nil
}

func (s *workspaceService) DeleteWorkspace(ctx context.Context, userID, id int64) error {
	// Chỉ owner được xoá (soft delete).
	if err := s.assertOwner(ctx, id, userID); err != nil {
		return err
	}
	if err := s.wsRepo.SoftDelete(ctx, id); err != nil {
		return mapNotFound(err)
	}
	return nil
}

// ---- Members ----

func (s *workspaceService) AddMember(ctx context.Context, actorID, wsID, targetUserID int64, roleName string) (*model.Member, error) {
	// Chỉ owner được thêm thành viên.
	if err := s.assertOwner(ctx, wsID, actorID); err != nil {
		return nil, err
	}
	// Role phải tồn tại (system role: owner/member).
	role, err := s.roleRepo.GetByName(ctx, roleName)
	if err != nil {
		return nil, mapNotFound(err)
	}
	// Đã là member rồi → conflict.
	if _, err := s.memberRepo.Get(ctx, wsID, targetUserID); err == nil {
		return nil, ErrConflict
	} else if !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("check existing member: %w", err)
	}

	m := &model.Member{WorkspaceID: wsID, UserID: targetUserID, RoleID: role.ID}
	if err := s.memberRepo.Add(ctx, m); err != nil {
		return nil, fmt.Errorf("add member: %w", err)
	}
	m.RoleName = role.Name
	return m, nil
}

func (s *workspaceService) ListMembers(ctx context.Context, userID, wsID int64) ([]*model.Member, error) {
	if _, err := s.assertMember(ctx, wsID, userID); err != nil {
		return nil, err
	}
	return s.memberRepo.ListByWorkspace(ctx, wsID)
}

func (s *workspaceService) RemoveMember(ctx context.Context, actorID, wsID, targetUserID int64) error {
	// Chỉ owner được xoá thành viên.
	if err := s.assertOwner(ctx, wsID, actorID); err != nil {
		return err
	}
	target, err := s.memberRepo.Get(ctx, wsID, targetUserID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("get target member: %w", err)
	}
	// Không cho xoá owner (tránh workspace mồ côi).
	if target.RoleName == model.RoleOwner {
		return ErrConflict
	}
	return s.memberRepo.Remove(ctx, wsID, targetUserID)
}

// ---- Projects ----

func (s *workspaceService) CreateProject(ctx context.Context, userID, wsID int64, key, name string) (*model.Project, error) {
	// Thành viên bất kỳ được tạo project.
	if _, err := s.assertMember(ctx, wsID, userID); err != nil {
		return nil, err
	}
	p := &model.Project{WorkspaceID: wsID, Key: key, Name: name}
	if err := s.projectRepo.Create(ctx, p); err != nil {
		return nil, fmt.Errorf("create project: %w", err)
	}
	return p, nil
}

func (s *workspaceService) ListProjects(ctx context.Context, userID, wsID int64) ([]*model.Project, error) {
	if _, err := s.assertMember(ctx, wsID, userID); err != nil {
		return nil, err
	}
	return s.projectRepo.ListByWorkspace(ctx, wsID)
}

// ---- Roles ----

func (s *workspaceService) ListRoles(ctx context.Context, userID, wsID int64) ([]*model.Role, error) {
	if _, err := s.assertMember(ctx, wsID, userID); err != nil {
		return nil, err
	}
	return s.roleRepo.ListByWorkspace(ctx, wsID)
}

// ---- Membership check + user sync ----

// CheckMembership: dùng cho gRPC (service khác hỏi user có thuộc workspace không).
// Trả về (isMember, roleName). Không phải member → (false, "", nil), KHÔNG lỗi.
func (s *workspaceService) CheckMembership(ctx context.Context, wsID, userID int64) (bool, string, error) {
	// Workspace đã soft-delete → coi như không phải member: member row còn sót lại
	// sau soft-delete, tránh cấp authz cho caller trên tenant đã chết.
	if _, err := s.wsRepo.GetByID(ctx, wsID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, "", nil
		}
		return false, "", fmt.Errorf("check workspace liveness: %w", err)
	}
	m, err := s.memberRepo.Get(ctx, wsID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, "", nil
		}
		return false, "", fmt.Errorf("check membership: %w", err)
	}
	return true, m.RoleName, nil
}

// EnsureUserAndDefaultWorkspace: gọi bởi Kafka consumer khi nhận auth.user.events.
// 1) Upsert user projection (idempotent).
// 2) Nếu user chưa có default workspace (slug u-<id>-default) thì tạo mới + owner member.
// Idempotent: nhận event trùng vẫn an toàn.
func (s *workspaceService) EnsureUserAndDefaultWorkspace(ctx context.Context, userID int64, email, name, avatar string) error {
	user := &model.User{ID: userID, Email: email, Name: name, AvatarURL: avatar}
	if err := s.userRepo.Upsert(ctx, user); err != nil {
		return fmt.Errorf("upsert user projection: %w", err)
	}

	slug := fmt.Sprintf("u-%d-default", userID)
	// Idempotent: chỉ tạo default workspace nếu user CHƯA có workspace còn sống ở slug
	// này (slugTaken bỏ qua row đã soft-delete, khớp partial unique index). Kafka
	// user.created chỉ phát 1 lần lúc đăng ký (user chưa có gì) nên nhánh tạo lại sau
	// soft-delete gần như không xảy ra thực tế; partial index đảm bảo INSERT không
	// dính unique_violation kể cả khi tồn tại row cùng slug đã xoá mềm.
	taken, err := s.slugTaken(ctx, slug)
	if err != nil {
		return fmt.Errorf("check default workspace: %w", err)
	}
	if taken {
		return nil // đã có default workspace còn sống → không tạo lại
	}

	wsName := "My Workspace"
	if name != "" {
		wsName = fmt.Sprintf("%s's Workspace", name)
	}
	if _, err := s.createWorkspaceTx(ctx, userID, slug, wsName); err != nil {
		return fmt.Errorf("create default workspace: %w", err)
	}
	return nil
}

// ---- helpers ----

// createWorkspaceTx: insert workspace + owner member trong 1 transaction (atomic).
// Dùng chung cho CreateWorkspace và default workspace.
func (s *workspaceService) createWorkspaceTx(ctx context.Context, ownerID int64, slug, name string) (*model.Workspace, error) {
	ownerRole, err := s.roleRepo.GetByName(ctx, model.RoleOwner)
	if err != nil {
		return nil, fmt.Errorf("resolve owner role: %w", err)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback() // no-op nếu đã Commit

	// Đảm bảo user projection tồn tại TRƯỚC khi insert member: FK
	// workspace_members.user_id → workspace.users. Đường HTTP CreateWorkspace có thể
	// chạy TRƯỚC khi Kafka user.created được consume (JWT hợp lệ ngay sau đăng ký),
	// nên projection có thể chưa có caller → member insert dính FK violation 500.
	// Insert placeholder id; event Kafka tới sau sẽ Upsert bổ sung email/name/avatar.
	// ON CONFLICT DO NOTHING → idempotent, an toàn cả khi gọi từ đường Kafka
	// (EnsureUserAndDefaultWorkspace đã Upsert user đầy đủ trước đó).
	if _, err = tx.ExecContext(ctx, `
        INSERT INTO workspace.users (id)
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING`,
		ownerID,
	); err != nil {
		return nil, fmt.Errorf("ensure user projection: %w", err)
	}

	ws := &model.Workspace{Slug: slug, Name: name, OwnerID: ownerID, Plan: model.WorkspacePlanFree}
	err = tx.QueryRowContext(ctx, `
        INSERT INTO workspace.workspaces (slug, name, owner_id, plan)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at, updated_at`,
		ws.Slug, ws.Name, ws.OwnerID, ws.Plan,
	).Scan(&ws.ID, &ws.CreatedAt, &ws.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert workspace: %w", err)
	}

	_, err = tx.ExecContext(ctx, `
        INSERT INTO workspace.workspace_members (workspace_id, user_id, role_id)
        VALUES ($1, $2, $3)`,
		ws.ID, ownerID, ownerRole.ID,
	)
	if err != nil {
		return nil, fmt.Errorf("add owner member: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return ws, nil
}

// slugTaken: slug đã bị workspace CÒN SỐNG chiếm chưa (bỏ qua row đã soft-delete).
// Khớp partial unique index idx_workspaces_slug (WHERE deleted_at IS NULL) và filter
// đọc GetBySlug: slug của workspace đã xoá mềm được tái sử dụng, nên dedupe chỉ xét
// row còn sống. Nếu đếm cả row đã xoá thì tầng app sẽ chặn tái dùng dù DB cho phép
// → mâu thuẫn với partial index (đây là lỗi hai bản fix song song từng đá nhau).
func (s *workspaceService) slugTaken(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM workspace.workspaces WHERE slug = $1 AND deleted_at IS NULL)`,
		slug,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check slug taken: %w", err)
	}
	return exists, nil
}

// assertMember: user phải là thành viên workspace, else ErrNotMember.
func (s *workspaceService) assertMember(ctx context.Context, wsID, userID int64) (*model.Member, error) {
	// Workspace phải còn sống trước khi xét membership: member row vẫn tồn tại sau
	// khi workspace bị soft-delete, nên nếu bỏ qua bước này thì thao tác ghi (vd
	// CreateProject/AddMember) sẽ vượt authz và tác động lên tenant đã chết.
	// GetByID lọc deleted_at IS NULL → workspace đã xoá mềm trả ErrNotFound.
	if _, err := s.wsRepo.GetByID(ctx, wsID); err != nil {
		return nil, mapNotFound(err)
	}
	m, err := s.memberRepo.Get(ctx, wsID, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotMember
		}
		return nil, fmt.Errorf("get member: %w", err)
	}
	return m, nil
}

// assertOwner: user phải là owner. Không phải member → ErrNotMember; member nhưng
// không phải owner → ErrNotOwner.
func (s *workspaceService) assertOwner(ctx context.Context, wsID, userID int64) error {
	m, err := s.assertMember(ctx, wsID, userID)
	if err != nil {
		return err
	}
	if m.RoleName != model.RoleOwner {
		return ErrNotOwner
	}
	return nil
}

// mapNotFound: đổi sql.ErrNoRows (wrap từ repo) thành sentinel ErrNotFound.
func mapNotFound(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// slugify: name → slug (lowercase, ký tự không phải a-z0-9 → hyphen, gộp/trim hyphen).
func slugify(name string) string {
	var b strings.Builder
	lastHyphen := false
	for _, r := range strings.ToLower(strings.TrimSpace(name)) {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			lastHyphen = false
		default:
			if b.Len() > 0 && !lastHyphen {
				b.WriteByte('-')
				lastHyphen = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "workspace"
	}
	return out
}

// randSuffix: hậu tố ngẫu nhiên ngắn (6 hex) để dedupe slug khi trùng.
func randSuffix() string {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "x"
	}
	return hex.EncodeToString(b)
}
