package service

import (
	"github.com/your-username/devops-for-se/services/api/internal/model"
	"github.com/your-username/devops-for-se/services/api/internal/repository"
)

type ProjectService interface {
	List() ([]model.Project, error)
	GetByID(id string) (model.Project, error)
	Create(project model.Project) (model.Project, error)
	Update(id string, project model.Project) (model.Project, error)
	Delete(id string) error
}

type projectService struct {
	repo repository.ProjectRepository
}

// Service layer = business logic
// Hiện tại đơn giản: chỉ gọi thẳng xuống repository
// Sau này sẽ thêm: validation, kiểm tra quyền, gửi event, logging...
//
// Ví dụ thực tế:
// func (ps *projectService) Create(project model.Project) (model.Project, error) {
//     // 1. Validate: tên không được trùng
//     // 2. Gọi repo.Create()
//     // 3. Gửi event "project.created" qua Redis
//     // 4. Return
// }

// Service gọi thẳng xuống repo - "pass-through" pattern
// Giống controller gọi service trong NestJS khi chưa có business logic phức tạp
func (ps *projectService) List() ([]model.Project, error) {
	return ps.repo.List()
}

func (ps *projectService) GetByID(id string) (model.Project, error) {
	return ps.repo.GetByID(id)
}

func (ps *projectService) Create(project model.Project) (model.Project, error) {
	return ps.repo.Create(project)
}

func (ps *projectService) Update(id string, project model.Project) (model.Project, error) {
	return ps.repo.Update(id, project)
}

func (ps *projectService) Delete(id string) error {
	return ps.repo.Delete(id)
}

func NewProjectService(repo repository.ProjectRepository) ProjectService {
	return &projectService{
		repo: repo,
	}
}
