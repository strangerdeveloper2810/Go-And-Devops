package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Env      string         `mapstructure:"env"`
	LogLevel string         `mapstructure:"log_level"`
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	MinIO    MinIOConfig    `mapstructure:"minio"`
	OTel     OTelConfig     `mapstructure:"otel"`
}

type ServerConfig struct {
	HTTPPort        int           `mapstructure:"http_port"`
	GRPCPort        int           `mapstructure:"grpc_port"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

type DatabaseConfig struct {
	URL string `mapstructure:"url"`
}

// MinIOConfig — kết nối object storage (MinIO, S3-compatible). File-service
// lưu nội dung file (attachment) vào bucket, chỉ giữ metadata trong Postgres.
// Endpoint: host:port của MinIO (dev = localhost:9000). AccessKey/SecretKey:
// credentials (dev = minioadmin/minioadmin). Bucket: bucket mặc định chứa
// attachment. UseSSL: bật TLS khi nói chuyện với MinIO (dev = false).
type MinIOConfig struct {
	Endpoint  string `mapstructure:"endpoint"`
	AccessKey string `mapstructure:"access_key"`
	SecretKey string `mapstructure:"secret_key"`
	Bucket    string `mapstructure:"bucket"`
	UseSSL    bool   `mapstructure:"use_ssl"`
}

type OTelConfig struct {
	Enabled         bool    `mapstructure:"enabled"`
	ServiceName     string  `mapstructure:"service_name"`
	OTLPEndpoint    string  `mapstructure:"otlp_endpoint"`
	TraceSampleRate float64 `mapstructure:"trace_sample_rate"`
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetEnvPrefix("PM_FILE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// AutomaticEnv chỉ tự bind các key viper ĐÃ biết (có SetDefault/BindEnv,
	// hoặc nằm trong config file đọc được). Các key BẮT BUỘC mà KHÔNG có
	// default phải BindEnv thủ công — nếu không Unmarshal sẽ bỏ qua env var,
	// dẫn tới validate fail dù env đã set đúng (bẫy kinh điển của viper).
	_ = v.BindEnv("database.url")
	_ = v.BindEnv("minio.access_key")
	_ = v.BindEnv("minio.secret_key")

	// Defaults
	v.SetDefault("env", "dev")
	v.SetDefault("log_level", "info")
	v.SetDefault("server.http_port", 8005)
	v.SetDefault("server.grpc_port", 9005)
	v.SetDefault("server.read_timeout", "15s")
	v.SetDefault("server.write_timeout", "15s")
	v.SetDefault("server.shutdown_timeout", "30s")
	v.SetDefault("minio.endpoint", "localhost:9000")
	v.SetDefault("minio.bucket", "pm-attachments")
	v.SetDefault("minio.use_ssl", false)
	v.SetDefault("otel.enabled", false)
	v.SetDefault("otel.service_name", "file-service")
	v.SetDefault("otel.otlp_endpoint", "otel-collector:4317")
	v.SetDefault("otel.trace_sample_rate", 1.0)

	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("/etc/pm-file")

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("read config file: %w", err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (c *Config) validate() error {
	if c.Env != "dev" && c.Env != "staging" && c.Env != "prod" {
		return fmt.Errorf("invalid env %q (want dev|staging|prod)", c.Env)
	}
	if c.Server.HTTPPort <= 0 || c.Server.HTTPPort > 65535 {
		return fmt.Errorf("invalid server.http_port %d", c.Server.HTTPPort)
	}
	if c.Server.GRPCPort <= 0 || c.Server.GRPCPort > 65535 {
		return fmt.Errorf("invalid server.grpc_port %d", c.Server.GRPCPort)
	}
	if c.Database.URL == "" {
		return fmt.Errorf("database.url is required")
	}
	if c.MinIO.Endpoint == "" {
		return fmt.Errorf("minio.endpoint is required")
	}
	if c.MinIO.AccessKey == "" {
		return fmt.Errorf("minio.access_key is required")
	}
	if c.MinIO.SecretKey == "" {
		return fmt.Errorf("minio.secret_key is required")
	}
	if c.MinIO.Bucket == "" {
		return fmt.Errorf("minio.bucket is required")
	}
	if c.OTel.Enabled && c.OTel.OTLPEndpoint == "" {
		return fmt.Errorf("otel.enabled=true but otel.otlp_endpoint is empty")
	}
	return nil
}
