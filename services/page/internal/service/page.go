package service

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/pm-platform/page/internal/model"
	"github.com/pm-platform/page/internal/repository"
)

// Sentinel errors — handler map sang HTTP status tương ứng.
// Dùng errors.Is để so khớp, không so sánh chuỗi.
var (
	ErrNotFound  = errors.New("not found")              // 404
	ErrNotMember = errors.New("not a workspace member") // 403
	ErrConflict  = errors.New("conflict")               // 409
)

// maxTreeDepth: guard độ sâu tối đa khi đi ngược chuỗi tổ tiên (chống lặp vô hạn nếu
// dữ liệu cây đã hỏng sẵn). Cây tài liệu thực tế nông hơn con số này rất nhiều.
const maxTreeDepth = 1000

// PageNode = 1 nút trong cây trang, dùng cho ListPages ở chế độ tree. Nhúng
// *model.Page nên các field ID/Title/... được "promote" ra ngoài khi serialize JSON.
type PageNode struct {
	*model.Page
	Children []*PageNode `json:"children,omitempty"`
}

// PageService: business logic + phân quyền (authz) cho domain page (Confluence core).
// page-service SỞ HỮU spaces + pages; authz dựa trên members_projection (read-model
// dựng từ Kafka workspace.events) → không gọi đồng bộ sang workspace-service.
type PageService interface {
	// ---- Spaces ----
	CreateSpace(ctx context.Context, actorID, workspaceID int64, key, name string) (*model.Space, error)
	ListSpaces(ctx context.Context, actorID, workspaceID int64) ([]*model.Space, error)
	GetSpace(ctx context.Context, actorID, spaceID int64) (*model.Space, error)
	UpdateSpace(ctx context.Context, actorID, spaceID int64, name string) (*model.Space, error)
	DeleteSpace(ctx context.Context, actorID, spaceID int64) error

	// ---- Pages ----
	CreatePage(ctx context.Context, actorID, spaceID int64, title string, parentID *int64, contentHTML, contentText string) (*model.Page, error)
	GetPage(ctx context.Context, actorID, pageID int64) (*model.Page, error)
	// ListPages: tree=true trả về cây (chỉ node gốc, con lồng trong Children);
	// tree=false trả về danh sách phẳng (mỗi page 1 node, không lồng con).
	ListPages(ctx context.Context, actorID, spaceID int64, tree bool) ([]*PageNode, error)
	ListChildren(ctx context.Context, actorID, pageID int64) ([]*model.Page, error)
	UpdatePage(ctx context.Context, actorID, pageID int64, title, contentHTML, contentText string, parentID *int64) (*model.Page, error)
	DeletePage(ctx context.Context, actorID, pageID int64) error
}

type pageService struct {
	spaceRepo  repository.SpaceRepository
	pageRepo   repository.PageRepository
	memberRepo repository.MemberProjectionRepo
}

// NewPageService — inject repos qua constructor (DI). memberRepo là read-model
// membership (dựng từ Kafka) → nền tảng authz cục bộ của page-service.
func NewPageService(
	spaceRepo repository.SpaceRepository,
	pageRepo repository.PageRepository,
	memberRepo repository.MemberProjectionRepo,
) PageService {
	return &pageService{
		spaceRepo:  spaceRepo,
		pageRepo:   pageRepo,
		memberRepo: memberRepo,
	}
}

// ---- Spaces ----

func (s *pageService) CreateSpace(ctx context.Context, actorID, workspaceID int64, key, name string) (*model.Space, error) {
	// Actor phải là thành viên workspace (authz qua members_projection dựng từ Kafka).
	if _, err := s.assertWorkspaceMember(ctx, actorID, workspaceID); err != nil {
		return nil, err
	}
	// Space key DUY NHẤT TOÀN HỆ THỐNG (Confluence-style): URL /spaces/<KEY> tra cứu
	// toàn cục nên 2 workspace cùng key sẽ nhập nhằng cross-tenant → chặn tại đây (409).
	if taken, err := s.spaceRepo.ExistsByKey(ctx, key); err != nil {
		return nil, fmt.Errorf("check space key: %w", err)
	} else if taken {
		return nil, ErrConflict
	}
	// owner = actor (người tạo space). created_at/updated_at do DB sinh (repo RETURNING).
	space := &model.Space{WorkspaceID: workspaceID, Key: key, Name: name, OwnerID: actorID}
	if err := s.spaceRepo.Create(ctx, space); err != nil {
		return nil, fmt.Errorf("create space: %w", err)
	}
	return space, nil
}

func (s *pageService) ListSpaces(ctx context.Context, actorID, workspaceID int64) ([]*model.Space, error) {
	// Phải là thành viên workspace mới xem được danh sách space.
	if _, err := s.assertWorkspaceMember(ctx, actorID, workspaceID); err != nil {
		return nil, err
	}
	return s.spaceRepo.ListByWorkspace(ctx, workspaceID)
}

func (s *pageService) GetSpace(ctx context.Context, actorID, spaceID int64) (*model.Space, error) {
	// assertSpaceMember đã resolve space + check membership → trả luôn space.
	return s.assertSpaceMember(ctx, actorID, spaceID)
}

func (s *pageService) UpdateSpace(ctx context.Context, actorID, spaceID int64, name string) (*model.Space, error) {
	// Thành viên bất kỳ được sửa (keep simple: không tách riêng quyền owner).
	space, err := s.assertSpaceMember(ctx, actorID, spaceID)
	if err != nil {
		return nil, err
	}
	// Chỉ ghi đè field được truyền (rỗng = giữ nguyên). key immutable vì global-unique.
	if name != "" {
		space.Name = name
	}
	if err := s.spaceRepo.Update(ctx, space); err != nil {
		return nil, mapNotFound(err)
	}
	return space, nil
}

func (s *pageService) DeleteSpace(ctx context.Context, actorID, spaceID int64) error {
	// Thành viên bất kỳ được xoá mềm space (keep simple).
	if _, err := s.assertSpaceMember(ctx, actorID, spaceID); err != nil {
		return err
	}
	if err := s.spaceRepo.SoftDelete(ctx, spaceID); err != nil {
		return mapNotFound(err)
	}
	return nil
}

// ---- Pages ----

func (s *pageService) CreatePage(ctx context.Context, actorID, spaceID int64, title string, parentID *int64, contentHTML, contentText string) (*model.Page, error) {
	// Actor phải là thành viên workspace của space (resolve space → workspace → membership).
	if _, err := s.assertSpaceMember(ctx, actorID, spaceID); err != nil {
		return nil, err
	}
	// parentID (nếu có) phải là page CÒN SỐNG CÙNG space: chặn ghép cây chéo space.
	if parentID != nil {
		parent, err := s.pageRepo.GetByID(ctx, *parentID)
		if err != nil {
			return nil, mapNotFound(err)
		}
		if parent.SpaceID != spaceID {
			return nil, ErrConflict
		}
	}
	// Sinh slug từ title, dedupe trong phạm vi space (khớp partial unique index).
	slug, err := s.uniquePageSlug(ctx, spaceID, title)
	if err != nil {
		return nil, err
	}
	// author = actor. version do DB set DEFAULT 1 (repo RETURNING gán lại).
	page := &model.Page{
		SpaceID:     spaceID,
		ParentID:    parentID,
		Title:       title,
		Slug:        slug,
		ContentHTML: contentHTML,
		ContentText: contentText,
		AuthorID:    actorID,
	}
	if err := s.pageRepo.Create(ctx, page); err != nil {
		return nil, fmt.Errorf("create page: %w", err)
	}
	return page, nil
}

func (s *pageService) GetPage(ctx context.Context, actorID, pageID int64) (*model.Page, error) {
	page, _, err := s.assertPageMember(ctx, actorID, pageID)
	if err != nil {
		return nil, err
	}
	return page, nil
}

func (s *pageService) ListPages(ctx context.Context, actorID, spaceID int64, tree bool) ([]*PageNode, error) {
	if _, err := s.assertSpaceMember(ctx, actorID, spaceID); err != nil {
		return nil, err
	}
	pages, err := s.pageRepo.ListBySpace(ctx, spaceID)
	if err != nil {
		return nil, err
	}
	if tree {
		return buildPageTree(pages), nil
	}
	// Flat: mỗi page 1 node, không lồng con.
	nodes := make([]*PageNode, 0, len(pages))
	for _, p := range pages {
		nodes = append(nodes, &PageNode{Page: p})
	}
	return nodes, nil
}

func (s *pageService) ListChildren(ctx context.Context, actorID, pageID int64) ([]*model.Page, error) {
	// Kiểm tra membership của page cha trước khi liệt kê con.
	if _, _, err := s.assertPageMember(ctx, actorID, pageID); err != nil {
		return nil, err
	}
	return s.pageRepo.ListChildren(ctx, pageID)
}

func (s *pageService) UpdatePage(ctx context.Context, actorID, pageID int64, title, contentHTML, contentText string, parentID *int64) (*model.Page, error) {
	page, _, err := s.assertPageMember(ctx, actorID, pageID)
	if err != nil {
		return nil, err
	}
	// Chỉ ghi đè field được truyền (rỗng = giữ nguyên). slug GIỮ NGUYÊN khi đổi title
	// để không vỡ link /space/<key>/<slug> đã chia sẻ.
	if title != "" {
		page.Title = title
	}
	if contentHTML != "" {
		page.ContentHTML = contentHTML
	}
	if contentText != "" {
		page.ContentText = contentText
	}
	// Di chuyển page sang cha mới (nếu truyền). nil = giữ vị trí hiện tại.
	if parentID != nil {
		if err := s.checkReparent(ctx, page, *parentID); err != nil {
			return nil, err
		}
		page.ParentID = parentID
	}
	// repo.Update bump version = version + 1 và đồng bộ RETURNING (version, updated_at).
	if err := s.pageRepo.Update(ctx, page); err != nil {
		return nil, mapNotFound(err)
	}
	return page, nil
}

func (s *pageService) DeletePage(ctx context.Context, actorID, pageID int64) error {
	if _, _, err := s.assertPageMember(ctx, actorID, pageID); err != nil {
		return err
	}
	if err := s.pageRepo.SoftDelete(ctx, pageID); err != nil {
		return mapNotFound(err)
	}
	return nil
}

// ---- authz helpers ----

// assertWorkspaceMember: actor phải là thành viên workspace (đọc members_projection
// dựng từ Kafka workspace.events). Không có membership → ErrNotMember.
func (s *pageService) assertWorkspaceMember(ctx context.Context, actorID, workspaceID int64) (*model.MemberProjection, error) {
	m, err := s.memberRepo.Get(ctx, workspaceID, actorID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotMember
		}
		return nil, fmt.Errorf("check workspace membership: %w", err)
	}
	return m, nil
}

// assertSpaceMember: resolve space → workspace_id rồi kiểm tra actor là thành viên.
// Trả về space để caller dùng tiếp (khỏi query lại). space đã soft-delete → ErrNotFound.
func (s *pageService) assertSpaceMember(ctx context.Context, actorID, spaceID int64) (*model.Space, error) {
	space, err := s.spaceRepo.GetByID(ctx, spaceID)
	if err != nil {
		return nil, mapNotFound(err)
	}
	if _, err := s.assertWorkspaceMember(ctx, actorID, space.WorkspaceID); err != nil {
		return nil, err
	}
	return space, nil
}

// assertPageMember: resolve page → space → workspace rồi kiểm tra membership.
// Trả về (page, space) để caller dùng tiếp. page/space đã soft-delete → ErrNotFound.
func (s *pageService) assertPageMember(ctx context.Context, actorID, pageID int64) (*model.Page, *model.Space, error) {
	page, err := s.pageRepo.GetByID(ctx, pageID)
	if err != nil {
		return nil, nil, mapNotFound(err)
	}
	space, err := s.assertSpaceMember(ctx, actorID, page.SpaceID)
	if err != nil {
		return nil, nil, err
	}
	return page, space, nil
}

// checkReparent: kiểm tra việc đặt page dưới newParentID có hợp lệ không — không tự
// làm cha, parent còn sống CÙNG space, và không tạo vòng lặp (parent không phải hậu
// duệ của page). Lỗi hợp lệ hoá → ErrConflict; parent không tồn tại → ErrNotFound.
func (s *pageService) checkReparent(ctx context.Context, page *model.Page, newParentID int64) error {
	if newParentID == page.ID {
		return ErrConflict // page không thể tự làm cha chính nó
	}
	parent, err := s.pageRepo.GetByID(ctx, newParentID)
	if err != nil {
		return mapNotFound(err)
	}
	if parent.SpaceID != page.SpaceID {
		return ErrConflict // không ghép cây chéo space
	}
	// Chống vòng lặp: đi ngược lên chuỗi tổ tiên của parent; gặp page.ID nghĩa là parent
	// đang là hậu duệ của page → đặt xuống đó sẽ tạo cycle. maxTreeDepth chặn lặp vô hạn.
	for cur, depth := parent.ParentID, 0; cur != nil && depth < maxTreeDepth; depth++ {
		if *cur == page.ID {
			return ErrConflict
		}
		ancestor, err := s.pageRepo.GetByID(ctx, *cur)
		if err != nil {
			return mapNotFound(err)
		}
		cur = ancestor.ParentID
	}
	return nil
}

// ---- helpers ----

// uniquePageSlug: sinh slug từ title rồi dedupe trong phạm vi space. Nếu trùng thì
// gắn hậu tố ngắn. Dedupe khớp partial unique index idx_pages_space_slug
// (WHERE deleted_at IS NULL) → slug của page đã xoá mềm được tái sử dụng.
func (s *pageService) uniquePageSlug(ctx context.Context, spaceID int64, title string) (string, error) {
	base := slugify(title)
	slug := base
	for i := 0; i < 5; i++ {
		taken, err := s.pageRepo.ExistsBySpaceAndSlug(ctx, spaceID, slug)
		if err != nil {
			return "", fmt.Errorf("check page slug: %w", err)
		}
		if !taken {
			return slug, nil // slug trống → dùng được
		}
		slug = base + "-" + randSuffix()
	}
	// Sau 5 lần vẫn trùng (rất hiếm) → dùng slug cuối; partial unique index là chốt chặn cuối.
	return slug, nil
}

// buildPageTree: dựng cây từ danh sách phẳng (đã sort theo id ở repo). Trả về các node
// gốc; con gắn vào cha theo thứ tự xuất hiện. Node có parent_id trỏ ra ngoài tập (mồ
// côi) được coi như gốc để không bị mất khỏi kết quả.
func buildPageTree(pages []*model.Page) []*PageNode {
	nodes := make(map[int64]*PageNode, len(pages))
	for _, p := range pages {
		nodes[p.ID] = &PageNode{Page: p}
	}
	roots := make([]*PageNode, 0)
	for _, p := range pages {
		node := nodes[p.ID]
		if p.ParentID != nil {
			if parent, ok := nodes[*p.ParentID]; ok {
				parent.Children = append(parent.Children, node)
				continue
			}
		}
		roots = append(roots, node)
	}
	return roots
}

// mapNotFound: đổi sql.ErrNoRows (wrap từ repo) thành sentinel ErrNotFound.
func mapNotFound(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// slugify: text → slug (lowercase, ký tự không phải a-z0-9 → hyphen, gộp/trim hyphen).
func slugify(text string) string {
	var b strings.Builder
	lastHyphen := false
	for _, r := range strings.ToLower(strings.TrimSpace(text)) {
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
		out = "page"
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
