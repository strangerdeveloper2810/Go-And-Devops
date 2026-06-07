// Package config loads runtime configuration via Viper from env vars.
//
// Moi service trong PM Platform deu theo pattern nay:
//   - env-first: env vars uu tien cao nhat
//   - struct-typed: config duoc parse thanh struct, khong phai key-value roi rac
//   - validated on boot: validate() chay luc startup, fail fast neu thieu config
//
// Cach dung:
//   cfg, err := config.Load()
//   // cfg.Server.HTTPPort, cfg.Database.URL, ...
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config la root config struct cho auth service.
// Moi field co tag mapstructure de Viper biet cach map tu env var.
// VD: env PM_AUTH_SERVER_HTTP_PORT → config.Server.HTTPPort
type Config struct {
	Env      string         `mapstructure:"env"`       // dev | staging | prod
	LogLevel string         `mapstructure:"log_level"` // debug | info | warn | error
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	OTel     OTelConfig     `mapstructure:"otel"`
}

// ServerConfig holds HTTP + gRPC server settings.
type ServerConfig struct {
	HTTPPort        int           `mapstructure:"http_port"`
	GRPCPort        int           `mapstructure:"grpc_port"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

// DatabaseConfig holds PostgreSQL connection settings.
// Chi can URL duy nhat — tat ca thong tin (host, port, user, pass, db name)
// nam trong connection string.
type DatabaseConfig struct {
	URL string `mapstructure:"url"` // postgres://user:pass@host:port/db?sslmode=disable
}

// JWTConfig holds token signing secrets and TTL.
// Access token: ngan han (15 phut), dung trong Authorization header.
// Refresh token: dai han (7 ngay), dung de lay access token moi.
//
// ⚠️ Secret PHAI duoc load tu env var, KHONG DUOC hardcode.
// ⚠️ Secret bi leak = ke tan cong co the tao JWT gia mao.
type JWTConfig struct {
	AccessSecret  string        `mapstructure:"access_secret"`
	RefreshSecret string        `mapstructure:"refresh_secret"`
	AccessTTL     time.Duration `mapstructure:"access_ttl"`
	RefreshTTL    time.Duration `mapstructure:"refresh_ttl"`
}

// OTelConfig holds OpenTelemetry tracing settings.
type OTelConfig struct {
	Enabled         bool    `mapstructure:"enabled"`
	ServiceName     string  `mapstructure:"service_name"`
	OTLPEndpoint    string  `mapstructure:"otlp_endpoint"`
	TraceSampleRate float64 `mapstructure:"trace_sample_rate"`
}

// Load reads configuration from env vars with optional config.yaml override.
// Tra ve *Config da validate hoac error.
func Load() (*Config, error) {
	v := viper.New()

	// Tat ca env vars cua auth service bat dau bang PM_AUTH_.
	// Viper tu dong map PM_AUTH_SERVER_HTTP_PORT → server.http_port
	v.SetEnvPrefix("PM_AUTH")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// ─── Defaults ─────────────────────────────────────────
	// Dev-friendly defaults. Production nen set explicit qua env vars.
	v.SetDefault("env", "dev")
	v.SetDefault("log_level", "info")

	v.SetDefault("server.http_port", 8001)
	v.SetDefault("server.grpc_port", 9001)
	v.SetDefault("server.read_timeout", "15s")
	v.SetDefault("server.write_timeout", "15s")
	v.SetDefault("server.shutdown_timeout", "30s")

	v.SetDefault("jwt.access_ttl", "15m")   // 15 phut
	v.SetDefault("jwt.refresh_ttl", "168h") // 7 ngay

	v.SetDefault("otel.enabled", false)
	v.SetDefault("otel.service_name", "auth-service")
	v.SetDefault("otel.otlp_endpoint", "otel-collector:4317")
	v.SetDefault("otel.trace_sample_rate", 1.0)

	// Optional config file override.
	// Thu doc config.yaml o thu muc hien tai. Khong co cung khong sao.
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			// File ton tai nhung bi loi (sai format, permission, ...)
			return nil, fmt.Errorf("read config file: %w", err)
		}
		// File khong ton tai → ok, dung env vars + defaults
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

// validate kiem tra tat ca required fields sau khi unmarshal.
// Fail o day = process khong start → khong co tinh huong "chay nua chung moi loi".
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
		return fmt.Errorf("database.url is required (set PM_AUTH_DATABASE_URL)")
	}
	if c.JWT.AccessSecret == "" {
		return fmt.Errorf("jwt.access_secret is required (set PM_AUTH_JWT_ACCESS_SECRET)")
	}
	if c.JWT.RefreshSecret == "" {
		return fmt.Errorf("jwt.refresh_secret is required (set PM_AUTH_JWT_REFRESH_SECRET)")
	}
	if c.OTel.Enabled && c.OTel.OTLPEndpoint == "" {
		return fmt.Errorf("otel.enabled=true but otel.otlp_endpoint is empty")
	}
	return nil
}
