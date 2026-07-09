package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"

	"github.com/pm-platform/file/internal/model"
	"github.com/pm-platform/file/internal/repository"
	"github.com/pm-platform/file/internal/storage"
)

// Sentinel errors — handler map sang HTTP status tương ứng.
// Dùng errors.Is để so khớp, không so sánh chuỗi.
var (
	ErrNotFound  = errors.New("not found") // 404
	ErrForbidden = errors.New("forbidden") // 403
)

// FileService: business logic + phân quyền (authz) cho domain file.
// Authz owner-based ở MVP — không có bảng ACL riêng: chỉ chủ file (OwnerID)
// mới được xóa; đọc metadata/tải nội dung thì caller đã xác thực bất kỳ đều được.
type FileService interface {
	// Upload: lưu nội dung lên object storage rồi ghi metadata. owner = caller.
	Upload(ctx context.Context, ownerID int64, workspaceID *int64, filename, contentType string, reader io.Reader, size int64) (*model.File, error)
	// GetMetadata: đọc metadata (không check owner) → ErrNotFound nếu thiếu/đã xóa.
	GetMetadata(ctx context.Context, id int64) (*model.File, error)
	// Download: stream nội dung từ storage (không check owner). Caller PHẢI Close ReadCloser.
	Download(ctx context.Context, id int64) (io.ReadCloser, *model.File, error)
	// Delete: chỉ owner mới được xóa (soft delete metadata + xóa object best-effort).
	Delete(ctx context.Context, ownerID, id int64) error
	// ListByOwner: liệt kê file còn sống của owner này.
	ListByOwner(ctx context.Context, ownerID int64) ([]*model.File, error)
}

type fileService struct {
	repo    repository.FileRepository
	storage *storage.Storage
}

// NewFileService — inject repository (metadata Postgres) + storage (nội dung MinIO).
func NewFileService(repo repository.FileRepository, st *storage.Storage) FileService {
	return &fileService{repo: repo, storage: st}
}

func (s *fileService) Upload(ctx context.Context, ownerID int64, workspaceID *int64, filename, contentType string, reader io.Reader, size int64) (*model.File, error) {
	// Sinh s3 key duy nhất dạng "<uuid>/<filename>" → 2 file trùng tên vẫn không đụng object.
	key := storage.NewObjectKey(filename)
	bucket := s.storage.Bucket()

	// Upload nội dung lên MinIO TRƯỚC, lấy etag về lưu kèm metadata (kiểm toàn vẹn).
	etag, err := s.storage.Put(ctx, key, reader, size, contentType)
	if err != nil {
		return nil, fmt.Errorf("upload object: %w", err)
	}

	f := &model.File{
		OwnerID:     ownerID,
		WorkspaceID: workspaceID,
		Name:        filename,
		Mime:        contentType,
		Size:        size,
		S3Key:       key,
		S3Bucket:    bucket,
		ETag:        etag,
	}
	// Ghi metadata vào Postgres. Nếu insert FAIL sau khi object đã lên MinIO thì
	// object thành rác mồ côi (không có row nào trỏ tới) → best-effort xóa object
	// để dọn, rồi mới trả lỗi. context.WithoutCancel: nếu ctx request đã bị hủy
	// (client ngắt kết nối giữa chừng) thì việc dọn rác vẫn phải chạy tới nơi.
	if err := s.repo.Create(ctx, f); err != nil {
		_ = s.storage.Remove(context.WithoutCancel(ctx), key)
		return nil, fmt.Errorf("create file metadata: %w", err)
	}
	return f, nil
}

func (s *fileService) GetMetadata(ctx context.Context, id int64) (*model.File, error) {
	f, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, mapNotFound(err)
	}
	return f, nil
}

func (s *fileService) Download(ctx context.Context, id int64) (io.ReadCloser, *model.File, error) {
	// Đọc metadata trước để lấy s3_key + xác nhận file còn sống (chưa soft-delete).
	f, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, mapNotFound(err)
	}
	// Mở object từ storage; caller nhận ReadCloser và PHẢI Close sau khi stream xong.
	rc, _, err := s.storage.Get(ctx, f.S3Key)
	if err != nil {
		return nil, nil, fmt.Errorf("open object: %w", err)
	}
	return rc, f, nil
}

func (s *fileService) Delete(ctx context.Context, ownerID, id int64) error {
	// Đọc metadata để check quyền sở hữu trước khi xóa.
	f, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return mapNotFound(err)
	}
	// Owner-only: chỉ chủ file mới được xóa, else 403.
	if f.OwnerID != ownerID {
		return ErrForbidden
	}
	// Soft delete metadata trước (nguồn sự thật cho authz + listing).
	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return mapNotFound(err)
	}
	// Xóa object trên MinIO best-effort: metadata đã soft-delete nên với người dùng
	// file coi như đã biến mất; nếu Remove fail thì object thành rác dọn sau, KHÔNG
	// rollback soft-delete. WithoutCancel để việc dọn vẫn chạy dù request đã hủy.
	_ = s.storage.Remove(context.WithoutCancel(ctx), f.S3Key)
	return nil
}

func (s *fileService) ListByOwner(ctx context.Context, ownerID int64) ([]*model.File, error) {
	return s.repo.ListByOwner(ctx, ownerID)
}

// mapNotFound: đổi sql.ErrNoRows (repo wrap qua %w) thành sentinel ErrNotFound.
func mapNotFound(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}
