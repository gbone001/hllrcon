package config

import (
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server     ServerConfig   `mapstructure:"server"`
	Log        LogConfig      `mapstructure:"log"`
	Session    SessionConfig  `mapstructure:"session"`
	Security   SecurityConfig `mapstructure:"security"`
	RCON       RCONConfig     `mapstructure:"rcon"`
	ConfigFile string         // Path to loaded config file (empty if using defaults)
}

type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port string `mapstructure:"port"`
}

type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"` // "text" or "json"
}

type SessionConfig struct {
	TimeoutMinutes int  `mapstructure:"timeout_minutes"`
	SecureCookie   bool `mapstructure:"secure_cookie"` // Use secure flag on cookies (requires HTTPS)
}

type SecurityConfig struct {
	EnableCORS            bool     `mapstructure:"enable_cors"`
	AllowedOrigins        []string `mapstructure:"allowed_origins"`
	EnableSecurityHeaders bool     `mapstructure:"enable_security_headers"`
}

type RCONConfig struct {
	DialTimeoutSeconds int `mapstructure:"dial_timeout_seconds"`
	MaxRequestSize     int `mapstructure:"max_request_size"`  // Max request size in bytes
	MaxResponseSize    int `mapstructure:"max_response_size"` // Max response size in bytes
}

// Load reads configuration from config file and environment variables
func Load(configPath string) (*Config, error) {
	v := viper.New()

	// Set defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", "8080")
	v.SetDefault("log.level", "info")
	v.SetDefault("log.format", "text")

	// Session defaults
	v.SetDefault("session.timeout_minutes", 30)
	v.SetDefault("session.secure_cookie", false) // Set to true if behind HTTPS

	// Security defaults
	v.SetDefault("security.enable_cors", false)
	v.SetDefault("security.allowed_origins", []string{"*"})
	v.SetDefault("security.enable_security_headers", true)

	// RCON defaults
	v.SetDefault("rcon.dial_timeout_seconds", 10)
	v.SetDefault("rcon.max_request_size", 1048576)   // 1MB
	v.SetDefault("rcon.max_response_size", 10485760) // 10MB

	// Config file
	if configPath != "" {
		v.SetConfigFile(configPath)
	} else {
		v.SetConfigName("config")
		v.SetConfigType("toml")
		v.AddConfigPath(".")
		v.AddConfigPath("./config")
	}

	// Environment variables
	v.SetEnvPrefix("HLL")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Railway.app provides PORT env var - use it if HLL_SERVER_PORT is not set
	if port := os.Getenv("PORT"); port != "" && os.Getenv("HLL_SERVER_PORT") == "" {
		v.Set("server.port", port)
	}

	// Read config file if it exists
	configFileLoaded := false
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		// Config file not found, will use defaults
	} else {
		configFileLoaded = true
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	if configFileLoaded {
		cfg.ConfigFile = v.ConfigFileUsed()
	}

	return &cfg, nil
}

// GetLogLevel converts string log level to slog.Level
func (c *LogConfig) GetLogLevel() slog.Level {
	switch c.Level {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	// No validation needed for web UI mode
	// Users connect to servers via the web interface
	return nil
}
