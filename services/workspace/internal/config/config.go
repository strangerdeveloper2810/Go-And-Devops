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
	Kafka    KafkaConfig    `mapstructure:"kafka"`
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

// KafkaConfig — kết nối Kafka để consume event user.created từ auth-service.
// Brokers: danh sách địa chỉ broker; UserEventsTopic: topic chứa event user;
// ConsumerGroup: group id để Kafka quản lý offset + phân phối partition.
type KafkaConfig struct {
	Brokers         []string `mapstructure:"brokers"`
	UserEventsTopic string   `mapstructure:"user_events_topic"`
	ConsumerGroup   string   `mapstructure:"consumer_group"`
}

type OTelConfig struct {
	Enabled         bool    `mapstructure:"enabled"`
	ServiceName     string  `mapstructure:"service_name"`
	OTLPEndpoint    string  `mapstructure:"otlp_endpoint"`
	TraceSampleRate float64 `mapstructure:"trace_sample_rate"`
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetEnvPrefix("PM_WORKSPACE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// AutomaticEnv chỉ tự bind các key viper ĐÃ biết (có SetDefault/BindEnv,
	// hoặc nằm trong config file đọc được). Các key BẮT BUỘC mà KHÔNG có
	// default phải BindEnv thủ công — nếu không Unmarshal sẽ bỏ qua env var,
	// dẫn tới validate fail dù env đã set đúng (bẫy kinh điển của viper).
	_ = v.BindEnv("database.url")

	// Defaults
	v.SetDefault("env", "dev")
	v.SetDefault("log_level", "info")
	v.SetDefault("server.http_port", 8002)
	v.SetDefault("server.grpc_port", 9002)
	v.SetDefault("server.read_timeout", "15s")
	v.SetDefault("server.write_timeout", "15s")
	v.SetDefault("server.shutdown_timeout", "30s")
	v.SetDefault("kafka.brokers", []string{"localhost:9094"})
	v.SetDefault("kafka.user_events_topic", "auth.user.events")
	v.SetDefault("kafka.consumer_group", "workspace-service")
	v.SetDefault("otel.enabled", false)
	v.SetDefault("otel.service_name", "workspace-service")
	v.SetDefault("otel.otlp_endpoint", "otel-collector:4317")
	v.SetDefault("otel.trace_sample_rate", 1.0)

	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("/etc/pm-workspace")

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
	if c.OTel.Enabled && c.OTel.OTLPEndpoint == "" {
		return fmt.Errorf("otel.enabled=true but otel.otlp_endpoint is empty")
	}
	return nil
}
