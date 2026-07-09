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
	JWT      JWTConfig      `mapstructure:"jwt"`
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

type JWTConfig struct {
	AccessSecret  string        `mapstructure:"access_secret"`
	RefreshSecret string        `mapstructure:"refresh_secret"`
	AccessTTL     time.Duration `mapstructure:"access_ttl"`
	RefreshTTL    time.Duration `mapstructure:"refresh_ttl"`
}

type OTelConfig struct {
	Enabled         bool    `mapstructure:"enabled"`
	ServiceName     string  `mapstructure:"service_name"`
	OTLPEndpoint    string  `mapstructure:"otlp_endpoint"`
	TraceSampleRate float64 `mapstructure:"trace_sample_rate"`
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetEnvPrefix("PM_AUTH")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// AutomaticEnv chỉ tự bind các key viper ĐÃ biết (có SetDefault/BindEnv,
	// hoặc nằm trong config file đọc được). Các key BẮT BUỘC mà KHÔNG có
	// default phải BindEnv thủ công — nếu không Unmarshal sẽ bỏ qua env var,
	// dẫn tới validate fail dù env đã set đúng (bẫy kinh điển của viper).
	_ = v.BindEnv("database.url")
	_ = v.BindEnv("jwt.access_secret")
	_ = v.BindEnv("jwt.refresh_secret")

	// Defaults
	v.SetDefault("env", "dev")
	v.SetDefault("log_level", "info")
	v.SetDefault("server.http_port", 8001)
	v.SetDefault("server.grpc_port", 9001)
	v.SetDefault("server.read_timeout", "15s")
	v.SetDefault("server.write_timeout", "15s")
	v.SetDefault("server.shutdown_timeout", "30s")
	v.SetDefault("jwt.access_ttl", "15m")
	v.SetDefault("jwt.refresh_ttl", "168h")
	v.SetDefault("otel.enabled", false)
	v.SetDefault("otel.service_name", "auth-service")
	v.SetDefault("otel.otlp_endpoint", "otel-collector:4317")
	v.SetDefault("otel.trace_sample_rate", 1.0)

	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("/etc/pm-auth")

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
	if c.JWT.AccessSecret == "" {
		return fmt.Errorf("jwt.access_secret is required")
	}
	if c.JWT.RefreshSecret == "" {
		return fmt.Errorf("jwt.refresh_secret is required")
	}
	if c.OTel.Enabled && c.OTel.OTLPEndpoint == "" {
		return fmt.Errorf("otel.enabled=true but otel.otlp_endpoint is empty")
	}
	return nil
}
