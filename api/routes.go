package api

import "github.com/gin-gonic/gin"

// SetupRoutes configures all API routes
func (a *API) SetupRoutes(router *gin.Engine) {
	// Serve frontend
	router.Static("/static", "./frontend/static")
	router.StaticFile("/", "./frontend/index.html")
	router.StaticFile("/index.html", "./frontend/index.html")

	// Health check
	router.GET("/health", a.Health)
	router.GET("/version", a.Version)

	api := router.Group("/api/v2")
	{
		// Connection management
		api.POST("/connect", a.Connect)
		api.POST("/disconnect", a.Disconnect)
		api.GET("/connection/status", a.ConnectionStatus)
		// Server info
		api.GET("/server", a.GetServerInfo)
		api.GET("/map-rotation", a.GetMapRotation)
		api.GET("/map-sequence", a.GetMapSequence)
		api.GET("/logs", a.GetAdminLog)
		api.GET("/profanities", a.GetProfanities)
		api.GET("/commands", a.GetDisplayableCommands)
		api.GET("/command-reference", a.GetClientReferenceData)
		api.GET("/changelist", a.GetServerChangelist)
		api.GET("/maps", a.GetMapList)

		// Players
		api.GET("/players", a.GetPlayers)
		api.GET("/players/:id", a.GetPlayer)
		api.POST("/players/:id/message", a.MessagePlayer)

		// VIPs
		api.GET("/vips", a.GetVIPs)
		api.POST("/vips", a.AddVIP)
		api.DELETE("/vips", a.RemoveVIP)
		api.POST("/vip-slots", a.SetVipSlotCount)

		// Admins
		api.GET("/admins", a.GetAdmins)
		api.GET("/admin-groups", a.GetAdminGroups)
		api.POST("/admins", a.AddAdmin)
		api.DELETE("/admins", a.RemoveAdmin)

		// Bans
		api.GET("/bans", a.GetBans)
		api.POST("/temp-ban", a.TempBan)
		api.POST("/perma-ban", a.PermaBan)
		api.DELETE("/temp-ban", a.RemoveTempBan)
		api.DELETE("/perma-ban", a.RemovePermaBan)

		// Admin actions
		api.POST("/broadcast", a.ServerBroadcast)
		api.POST("/kick", a.KickPlayer)
		api.POST("/punish", a.PunishPlayer)
		api.POST("/change-map", a.ChangeMap)
		api.POST("/welcome-message", a.SetWelcomeMessage)

		// Player management
		api.POST("/force-team-switch", a.ForceTeamSwitch)
		api.POST("/remove-from-squad", a.RemovePlayerFromSquad)
		api.POST("/disband-squad", a.DisbandSquad)

		// Map rotation management
		api.POST("/map-rotation", a.AddMapToRotation)
		api.DELETE("/map-rotation", a.RemoveMapFromRotation)

		// Map sequence management
		api.POST("/map-sequence", a.AddMapToSequence)
		api.DELETE("/map-sequence", a.RemoveMapFromSequence)
		api.PUT("/map-sequence/move", a.MoveMapInSequence)
		api.POST("/map-shuffle", a.SetMapShuffleEnabled)

		// Sector layout
		api.POST("/sector-layout", a.SetSectorLayout)

		// Server settings
		api.POST("/team-switch-cooldown", a.SetTeamSwitchCooldown)
		api.POST("/max-queued-players", a.SetMaxQueuedPlayers)
		api.POST("/idle-kick-duration", a.SetIdleKickDuration)
		api.POST("/high-ping-threshold", a.SetHighPingThreshold)

		// Auto balance
		api.POST("/auto-balance/enabled", a.SetAutoBalanceEnabled)
		api.POST("/auto-balance/threshold", a.SetAutoBalanceThreshold)

		// Vote kick
		api.POST("/vote-kick/enabled", a.SetVoteKickEnabled)
		api.POST("/vote-kick/threshold", a.SetVoteKickThreshold)
		api.POST("/vote-kick/reset", a.ResetVoteKickThreshold)

		// Match timers
		api.POST("/match-timer", a.SetMatchTimer)
		api.DELETE("/match-timer", a.RemoveMatchTimer)
		api.POST("/warmup-timer", a.SetWarmupTimer)
		api.DELETE("/warmup-timer", a.RemoveWarmupTimer)

		// Dynamic weather
		api.POST("/dynamic-weather", a.SetDynamicWeatherEnabled)

		// Profanity filter
		api.POST("/profanities", a.AddProfanities)
		api.DELETE("/profanities", a.RemoveProfanities)
	}

	// Catch-all error handler for unmatched routes
	router.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Silently ignore source map requests (DevTools noise)
		if len(path) > 4 && path[len(path)-4:] == ".map" {
			c.Status(204)
			return
		}

		// Return helpful 404 for other requests
		c.JSON(404, gin.H{
			"error": "endpoint not found",
			"path":  path,
		})
	})
}
