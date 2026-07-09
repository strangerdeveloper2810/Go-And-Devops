// Package storage bọc MinIO (S3-compatible object storage). File-service
// lưu NỘI DUNG file ở đây, còn metadata (tên, size, owner...) nằm ở Postgres.
package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/pm-platform/file/internal/config"
)

// Storage bọc *minio.Client kèm bucket mặc định lấy từ config.
// Tách struct riêng để handler/service không phụ thuộc trực tiếp SDK.
type Storage struct {
	mc     *minio.Client
	bucket string
}

// NewStorage khởi tạo MinIO client từ config và đảm bảo bucket mặc định tồn tại.
// Gọi 1 lần lúc startup (giống database.Connect) — fail fast nếu MinIO chết.
func NewStorage(cfg config.MinIOConfig) (*Storage, error) {
	mc, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("init minio client: %w", err)
	}

	s := &Storage{mc: mc, bucket: cfg.Bucket}
	if err := s.ensureBucket(context.Background(), cfg.Bucket); err != nil {
		return nil, err
	}
	return s, nil
}

// ensureBucket tạo bucket nếu chưa có (idempotent). Nếu 2 instance cùng khởi
// động và cùng gọi MakeBucket, kẻ chậm hơn nhận BucketAlreadyOwnedByYou —
// coi như đã tồn tại và bỏ qua.
func (s *Storage) ensureBucket(ctx context.Context, bucket string) error {
	exists, err := s.mc.BucketExists(ctx, bucket)
	if err != nil {
		return fmt.Errorf("check bucket %q: %w", bucket, err)
	}
	if exists {
		return nil
	}
	if err := s.mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
		code := minio.ToErrorResponse(err).Code
		if code == "BucketAlreadyOwnedByYou" || code == "BucketAlreadyExists" {
			return nil
		}
		return fmt.Errorf("create bucket %q: %w", bucket, err)
	}
	return nil
}

// Bucket trả về tên bucket mặc định (service dùng để ghi cột s3_bucket).
func (s *Storage) Bucket() string { return s.bucket }

// Put upload nội dung file lên bucket mặc định. size là số byte đã biết trước
// (-1 nếu stream không biết độ dài). Trả ETag để lưu vào metadata (kiểm toàn vẹn).
func (s *Storage) Put(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) (string, error) {
	info, err := s.mc.PutObject(ctx, s.bucket, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("put object %q: %w", objectKey, err)
	}
	return info.ETag, nil
}

// Get mở object để đọc nội dung. Trả io.ReadCloser (caller PHẢI Close) kèm
// ObjectInfo (size, content-type...). minio GetObject là lazy — chưa gọi server
// tới khi Read/Stat; ta Stat() ngay để phát hiện not-found sớm và trả metadata.
func (s *Storage) Get(ctx context.Context, objectKey string) (io.ReadCloser, minio.ObjectInfo, error) {
	obj, err := s.mc.GetObject(ctx, s.bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, minio.ObjectInfo{}, fmt.Errorf("get object %q: %w", objectKey, err)
	}
	info, err := obj.Stat()
	if err != nil {
		_ = obj.Close()
		return nil, minio.ObjectInfo{}, fmt.Errorf("stat object %q: %w", objectKey, err)
	}
	return obj, info, nil
}

// Remove xóa hẳn object khỏi bucket (dùng khi soft-delete metadata hoặc dọn rác).
func (s *Storage) Remove(ctx context.Context, objectKey string) error {
	if err := s.mc.RemoveObject(ctx, s.bucket, objectKey, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("remove object %q: %w", objectKey, err)
	}
	return nil
}

// PresignedGetURL sinh URL tải trực tiếp có chữ ký, hết hạn sau expiry. Cho phép
// client tải từ MinIO mà không đi qua file-service (tiết kiệm băng thông service).
func (s *Storage) PresignedGetURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	u, err := s.mc.PresignedGetObject(ctx, s.bucket, objectKey, expiry, url.Values{})
	if err != nil {
		return "", fmt.Errorf("presign get url %q: %w", objectKey, err)
	}
	return u.String(), nil
}

// NewObjectKey sinh object key dạng "<uuid>/<filename>". UUID phía trước tránh
// đụng tên khi 2 file trùng tên; giữ lại filename để URL/tải xuống thân thiện.
func NewObjectKey(filename string) string {
	return uuid.NewString() + "/" + filename
}
