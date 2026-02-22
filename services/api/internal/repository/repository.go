package repository

import (
	"database/sql"
	"time"

	"github.com/your-username/devops-for-se/services/api/internal/model"
)

type ProjectRepository interface {
	List() ([]model.Project, error)
	GetByID(id string) (model.Project, error)
	Create(project model.Project) (model.Project, error)
	Update(id string, project model.Project) (model.Project, error)
	Delete(id string) error
}

type projectRepository struct {
	db *sql.DB
}

// ==================== LIST ====================
// db.Query() = SELECT nhiều rows
// rows.Next() = loop từng row (giống for...of trong JS)
// rows.Scan() = map cột → struct field THEO THỨ TỰ SELECT
// defer rows.Close() = đóng cursor khi function xong
// append() = thêm vào slice (giống array.push() trong JS)
func (pr *projectRepository) List() ([]model.Project, error) {
	rows, err := pr.db.Query(
		"SELECT id, name, git_url, branch, status, created_at, updated_at, deleted_at FROM projects WHERE deleted_at IS NULL",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []model.Project
	for rows.Next() {
		var p model.Project
		err := rows.Scan(&p.ID, &p.Name, &p.GitURL, &p.Branch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

// ==================== GET BY ID ====================
// db.QueryRow() = SELECT 1 row duy nhất
// Khác db.Query(): không cần rows.Next(), không cần rows.Close()
// Chain .Scan() trực tiếp, chỉ trả về error
// $1 = placeholder cho param (PostgreSQL dùng $1, $2... | MySQL dùng ?)
func (pr *projectRepository) GetByID(id string) (model.Project, error) {
	var p model.Project
	err := pr.db.QueryRow(
		"SELECT id, name, git_url, branch, status, created_at, updated_at, deleted_at FROM projects WHERE id = $1 AND deleted_at IS NULL", id,
	).Scan(&p.ID, &p.Name, &p.GitURL, &p.Branch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt)

	if err != nil {
		return model.Project{}, err
	}
	return p, nil
}

// ==================== CREATE ====================
// INSERT + RETURNING = insert data rồi trả về row vừa tạo
// Dùng QueryRow vì RETURNING trả về 1 row
// Chỉ insert name, git_url, branch (id, status, timestamps tự generate bởi DB)
//
// Giống JS:
// const result = await pool.query(
//   'INSERT INTO projects (name, git_url, branch) VALUES ($1, $2, $3) RETURNING *',
//   [project.name, project.gitUrl, project.branch]
// )
func (pr *projectRepository) Create(project model.Project) (model.Project, error) {
	var p model.Project
	err := pr.db.QueryRow(
		`INSERT INTO projects (name, git_url, branch)
		 VALUES ($1, $2, $3)
		 RETURNING id, name, git_url, branch, status, created_at, updated_at, deleted_at`,
		project.Name, project.GitURL, project.Branch,
	).Scan(&p.ID, &p.Name, &p.GitURL, &p.Branch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt)

	if err != nil {
		return model.Project{}, err
	}
	return p, nil
}

// ==================== UPDATE ====================
// UPDATE + SET + WHERE + RETURNING
// updated_at = NOW() → tự cập nhật thời gian sửa
// $1, $2, $3, $4 = params theo thứ tự truyền vào
func (pr *projectRepository) Update(id string, project model.Project) (model.Project, error) {
	var p model.Project
	err := pr.db.QueryRow(
		`UPDATE projects
		 SET name = $1, git_url = $2, branch = $3, status = $4, updated_at = NOW()
		 WHERE id = $5 AND deleted_at IS NULL
		 RETURNING id, name, git_url, branch, status, created_at, updated_at, deleted_at`,
		project.Name, project.GitURL, project.Branch, project.Status, id,
	).Scan(&p.ID, &p.Name, &p.GitURL, &p.Branch, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt)

	if err != nil {
		return model.Project{}, err
	}
	return p, nil
}

// ==================== DELETE (Soft Delete) ====================
// db.Exec() = không cần data trả về (chỉ cần biết thành công hay thất bại)
// Soft delete = UPDATE deleted_at thay vì DELETE thật
// Giống JS: await pool.query('UPDATE ... SET deleted_at = NOW() WHERE id = $1', [id])
func (pr *projectRepository) Delete(id string) error {
	result, err := pr.db.Exec(
		"UPDATE projects SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
		time.Now(), id,
	)
	if err != nil {
		return err
	}

	// RowsAffected() = số rows bị ảnh hưởng
	// Nếu = 0 → không tìm thấy project (id sai hoặc đã xóa rồi)
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows // "không tìm thấy" → handler sẽ trả 404
	}
	return nil
}

func NewProjectRepository(db *sql.DB) ProjectRepository {
	return &projectRepository{
		db: db,
	}
}
