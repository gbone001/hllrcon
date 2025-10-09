package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Sledro/hllrcon/api"
	"github.com/Sledro/hllrcon/config"
	"github.com/Sledro/hllrcon/session"
	"github.com/gin-gonic/gin"
	"github.com/lmittmann/tint"
)

// Version information (set via ldflags during build)
var (
	Version   = "dev"
	GitCommit = "unknown"
	BuildDate = "unknown"
)

func main() {
	// Load configuration
	cfg, err := config.Load("")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Setup logger
	setupLogger(cfg)

	// Log config file status
	if cfg.ConfigFile != "" {
		slog.Info("Loaded config file", "path", cfg.ConfigFile)
	} else {
		slog.Info("Using default configuration")
	}

	slog.Info("Starting HLL RCON Web UI",
		"version", Version,
		"commit", GitCommit,
		"build_date", BuildDate,
		"log_level", cfg.Log.Level,
		"log_format", cfg.Log.Format,
		"session_timeout", cfg.Session.TimeoutMinutes,
		"secure_cookie", cfg.Session.SecureCookie,
		"cors_enabled", cfg.Security.EnableCORS,
	)

	// Setup Gin
	if cfg.Log.Level != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(ginLogger(), gin.Recovery())

	// Apply security middleware
	if cfg.Security.EnableSecurityHeaders {
		slog.Info("Security headers enabled")
		router.Use(api.SecurityHeaders())
	}

	// Apply CORS if enabled
	if cfg.Security.EnableCORS {
		slog.Info("CORS enabled", "allowed_origins", cfg.Security.AllowedOrigins)
		router.Use(api.CORS(cfg.Security.AllowedOrigins))
	}

	// Initialize session manager and API
	slog.Info("Initializing Web UI")
	sessionMgr := session.NewManager(time.Duration(cfg.Session.TimeoutMinutes) * time.Minute)

	rconConfig := api.RCONConfig{
		DialTimeout:     cfg.RCON.DialTimeoutSeconds,
		MaxRequestSize:  cfg.RCON.MaxRequestSize,
		MaxResponseSize: cfg.RCON.MaxResponseSize,
	}
	apiHandler := api.NewAPI(sessionMgr, Version, GitCommit, BuildDate, cfg.Session.SecureCookie, rconConfig)

	// Setup API routes
	apiHandler.SetupRoutes(router)

	// Create HTTP server
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		slog.Info("Starting HTTP server", "address", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Shutting down gracefully...")

	// Graceful shutdown with 10 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}

	slog.Info("Server stopped")
}

// setupLogger configures the global logger with slog and tint
func setupLogger(cfg *config.Config) {
	var handler slog.Handler

	level := cfg.Log.GetLogLevel()

	if cfg.Log.Format == "json" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: level,
		})
	} else {
		// Use tint for pretty colored output
		handler = tint.NewHandler(os.Stdout, &tint.Options{
			Level:      level,
			TimeFormat: time.Kitchen,
		})
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
}

// ginLogger is a middleware that logs HTTP requests using slog
func ginLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		method := c.Request.Method
		clientIP := c.ClientIP()

		if raw != "" {
			path = path + "?" + raw
		}

		level := slog.LevelInfo
		if statusCode >= 500 {
			level = slog.LevelError
		} else if statusCode >= 400 {
			level = slog.LevelWarn
		}

		slog.Log(c.Request.Context(), level, "HTTP request",
			"method", method,
			"path", path,
			"status", statusCode,
			"latency", latency,
			"client_ip", clientIP,
		)
	}
}
