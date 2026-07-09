// Package config loads runtime configuration via Viper from env vars
// (with an optional config.yaml override). Each service in PM Platform
// follows the same shape: env-first, struct-typed, validated on boot.
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config is the full runtime configuration for api-gateway.
//
// Fields are flat (one struct per concern) so env mapping is predictable:
// nested field `Server.HTTPPort` ⇔ env `SERVER_HTTP_PORT`.
type Config struct {
	Env      string         `mapstructure:"env"`       // dev|staging|prod
	LogLevel string         `mapstructure:"log_level"` // debug|info|warn|error
	Server   ServerConfig   `mapstructure:"server"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	OTel     OTelConfig     `mapstructure:"otel"`
	Upstream UpstreamConfig `mapstructure:"upstream"`
}

type ServerConfig struct {
	HTTPPort        int           `mapstructure:"http_port"`
	GRPCPort        int           `mapstructure:"grpc_port"`
	ReadTimeout     time.Duration `mapstructure:"read_timeout"`
	WriteTimeout    time.Duration `mapstructure:"write_timeout"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

type JWTConfig struct {
	AccessSecret  string `mapstructure:"access_secret"`
	RefreshSecret string `mapstructure:"refresh_secret"`
}

type OTelConfig struct {
	Enabled         bool    `mapstructure:"enabled"`
	ServiceName     string  `mapstructure:"service_name"`
	OTLPEndpoint    string  `mapstructure:"otlp_endpoint"`
	TraceSampleRate float64 `mapstructure:"trace_sample_rate"`
}

// UpstreamConfig holds gRPC addresses of services this gateway proxies to.
// In phase 0 most are unused; populated as services are added.
type UpstreamConfig struct {
	AuthAddr         string `mapstructure:"auth_addr"`      // gRPC addr (VerifyToken)
	AuthHTTPAddr     string `mapstructure:"auth_http_addr"` // HTTP addr (reverse proxy register/login)
	WorkspaceAddr    string `mapstructure:"workspace_addr"`
	IssueAddr        string `mapstructure:"issue_addr"`
	PageAddr         string `mapstructure:"page_addr"`
	FileAddr         string `mapstructure:"file_addr"`
	SearchAddr       string `mapstructure:"search_addr"`
	NotificationAddr string `mapstructure:"notification_addr"`
	AIAddr           string `mapstructure:"ai_addr"`
	RealtimeAddr     string `mapstructure:"realtime_addr"`
	ReportAddr       string `mapstructure:"report_addr"`
	AuditAddr        string `mapstructure:"audit_addr"`
}

// Load reads configuration from env vars + optional ./config.yaml file.
// Returns a populated Config or an error if validation fails.
func Load() (*Config, error) {
	v := viper.New()

	// Env mapping: NESTED__SUB → NESTED.SUB; underscore is replaced inside Viper.
	v.SetEnvPrefix("PM_API_GATEWAY")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Defaults
	v.SetDefault("env", "dev")
	v.SetDefault("log_level", "info")

	v.SetDefault("server.http_port", 8000)
	v.SetDefault("server.grpc_port", 9000)
	v.SetDefault("server.read_timeout", "15s")
	v.SetDefault("server.write_timeout", "15s")
	v.SetDefault("server.shutdown_timeout", "30s")

	v.SetDefault("otel.enabled", false)
	v.SetDefault("otel.service_name", "api-gateway")
	v.SetDefault("otel.otlp_endpoint", "otel-collector:4317")
	v.SetDefault("otel.trace_sample_rate", 1.0)

	// Upstream auth addresses. SetDefault vừa cho giá trị mặc định (docker
	// service name), vừa để AutomaticEnv bind được env override (viper chỉ
	// bind key nó đã biết — xem note tương tự ở auth service config).
	v.SetDefault("upstream.auth_addr", "auth-service:9001")
	v.SetDefault("upstream.auth_http_addr", "auth-service:8001")

	// Optional file override (mounted ConfigMap or local dev override)
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("/etc/pm-api-gateway")
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("read config file: %w", err)
		}
		// File not found is fine — env vars + defaults suffice.
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
	if c.OTel.Enabled && c.OTel.OTLPEndpoint == "" {
		return fmt.Errorf("otel.enabled=true but otel.otlp_endpoint is empty")
	}
	return nil
}
