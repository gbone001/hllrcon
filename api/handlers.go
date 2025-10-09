package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Sledro/hllrcon/maps"
	"github.com/Sledro/hllrcon/rcon"
	"github.com/Sledro/hllrcon/session"
	"github.com/gin-gonic/gin"
)

type API struct {
	sessionManager *session.Manager
	version        string
	gitCommit      string
	buildDate      string
	secureCookie   bool
	rconConfig     RCONConfig
}

type RCONConfig struct {
	DialTimeout     int
	MaxRequestSize  int
	MaxResponseSize int
}

func NewAPI(sessionManager *session.Manager, version, gitCommit, buildDate string, secureCookie bool, rconConfig RCONConfig) *API {
	return &API{
		sessionManager: sessionManager,
		version:        version,
		gitCommit:      gitCommit,
		buildDate:      buildDate,
		secureCookie:   secureCookie,
		rconConfig:     rconConfig,
	}
}

// getClient returns the RCON client from the user's session
func (a *API) getClient(c *gin.Context) (*rcon.Client, error) {
	// Get from session cookie
	sessionID, err := c.Cookie("hll_session")
	if err != nil {
		return nil, fmt.Errorf("no session cookie found")
	}

	sess, exists := a.sessionManager.Get(sessionID)
	if !exists {
		return nil, fmt.Errorf("session not found or expired")
	}

	return sess.Client, nil
}

// Generic command executor
func (a *API) executeCommand(c *gin.Context, command string, contentBody interface{}) {
	slog.Info("API request",
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"command", command,
		"client_ip", c.ClientIP(),
	)

	client, err := a.getClient(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not connected. Please connect first."})
		return
	}

	resp, err := client.Execute(command, contentBody)
	if err != nil {
		slog.Error("Command execution failed", "command", command, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if resp.StatusCode != 200 {
		slog.Warn("Command returned non-200 status",
			"command", command,
			"status", resp.StatusCode,
			"message", resp.StatusMessage,
		)
		c.JSON(resp.StatusCode, gin.H{
			"error":   resp.StatusMessage,
			"content": resp.ContentBody,
		})
		return
	}

	slog.Debug("Command successful", "command", command)

	// Parse ContentBody if it's a JSON string
	result := a.parseContentBody(resp.ContentBody)
	c.JSON(http.StatusOK, result)
}

// parseContentBody attempts to parse ContentBody string as JSON, returns raw value if not JSON
func (a *API) parseContentBody(contentBody interface{}) interface{} {
	// If it's already not a string, return as-is
	str, ok := contentBody.(string)
	if !ok {
		return contentBody
	}

	// If empty string, return as-is
	if str == "" {
		return str
	}

	// Try to parse as JSON
	var parsed interface{}
	if err := json.Unmarshal([]byte(str), &parsed); err != nil {
		// Not JSON, return original string
		return str
	}

	return parsed
}

// Health check
func (a *API) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Version returns version information
func (a *API) Version(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"version":    a.version,
		"git_commit": a.gitCommit,
		"build_date": a.buildDate,
	})
}

// Connect establishes a new RCON connection for this session
func (a *API) Connect(c *gin.Context) {
	var req struct {
		Host     string `json:"host" binding:"required"`
		Port     int    `json:"port" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slog.Info("New connection request", "client_ip", c.ClientIP())

	sess, err := a.sessionManager.Create(req.Host, req.Port, req.Password, a.rconConfig.DialTimeout, a.rconConfig.MaxRequestSize, a.rconConfig.MaxResponseSize)
	if err != nil {
		slog.Error("Failed to create session", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect: " + err.Error()})
		return
	}

	// Set session cookie
	c.SetCookie("hll_session", sess.ID, 3600, "/", "", a.secureCookie, true)

	slog.Info("Session created", "session_id", sess.ID)
	c.JSON(http.StatusOK, gin.H{
		"status":     "connected",
		"session_id": sess.ID,
		"host":       req.Host,
		"port":       req.Port,
	})
}

// Disconnect closes the RCON connection for this session
func (a *API) Disconnect(c *gin.Context) {
	sessionID, err := c.Cookie("hll_session")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active session"})
		return
	}

	a.sessionManager.Remove(sessionID)
	c.SetCookie("hll_session", "", -1, "/", "", false, true)

	slog.Info("Session disconnected", "session_id", sessionID)
	c.JSON(http.StatusOK, gin.H{"status": "disconnected"})
}

// ConnectionStatus checks if user has an active connection
func (a *API) ConnectionStatus(c *gin.Context) {
	sessionID, err := c.Cookie("hll_session")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"connected": false})
		return
	}

	sess, exists := a.sessionManager.Get(sessionID)
	if !exists {
		c.JSON(http.StatusOK, gin.H{"connected": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"connected":    true,
		"host":         sess.Host,
		"port":         sess.Port,
		"connected_at": sess.CreatedAt,
		"last_used":    sess.LastUsed,
	})
}

// GetServerInfo gets server information
func (a *API) GetServerInfo(c *gin.Context) {
	infoType := c.Query("type")
	if infoType == "" {
		infoType = "session"
	}

	value := c.Query("value")

	a.executeCommand(c, "GetServerInformation", map[string]string{
		"Name":  infoType,
		"Value": value,
	})
}

// GetPlayers gets all players
func (a *API) GetPlayers(c *gin.Context) {
	a.executeCommand(c, "GetServerInformation", map[string]string{
		"Name":  "players",
		"Value": "",
	})
}

// GetPlayer gets a specific player
func (a *API) GetPlayer(c *gin.Context) {
	playerID := c.Param("id")
	a.executeCommand(c, "GetServerInformation", map[string]string{
		"Name":  "player",
		"Value": playerID,
	})
}

// GetMapRotation gets the map rotation
func (a *API) GetMapRotation(c *gin.Context) {
	a.executeCommand(c, "GetServerInformation", map[string]string{
		"Name":  "maprotation",
		"Value": "",
	})
}

// GetMapSequence gets the map sequence
func (a *API) GetMapSequence(c *gin.Context) {
	a.executeCommand(c, "GetServerInformation", map[string]string{
		"Name":  "mapsequence",
		"Value": "",
	})
}

// ServerBroadcast sends a broadcast message
func (a *API) ServerBroadcast(c *gin.Context) {
	var req struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "ServerBroadcast", map[string]string{
		"Message": req.Message,
	})
}

// KickPlayer kicks a player
func (a *API) KickPlayer(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "KickPlayer", map[string]string{
		"PlayerId": req.PlayerID,
		"Reason":   req.Reason,
	})
}

// ChangeMap changes the current map
func (a *API) ChangeMap(c *gin.Context) {
	var req struct {
		MapName string `json:"map_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "ChangeMap", map[string]string{
		"MapName": req.MapName,
	})
}

// GetAdminLog gets admin logs
func (a *API) GetAdminLog(c *gin.Context) {
	seconds := c.DefaultQuery("seconds", "3600") // Default to 1 hour

	a.executeCommand(c, "GetAdminLog", map[string]string{
		"LogBackTrackTime": seconds,
		"Filters":          "",
	})
}

// GetVIPs gets VIP list
func (a *API) GetVIPs(c *gin.Context) {
	a.executeCommand(c, "GetServerInformation", map[string]string{
		"Name":  "vipplayers",
		"Value": "",
	})
}

// AddVIP adds a VIP
func (a *API) AddVIP(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
		Comment  string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "AddVip", map[string]string{
		"PlayerId": req.PlayerID,
		"Comment":  req.Comment,
	})
}

// RemoveVIP removes a VIP
func (a *API) RemoveVIP(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveVip", map[string]string{
		"PlayerId": req.PlayerID,
	})
}

// GetBans gets ban lists
func (a *API) GetBans(c *gin.Context) {
	banType := c.Query("type")

	var command string
	switch banType {
	case "temp", "temporary":
		command = "GetTemporaryBans"
	case "perma", "permanent":
		command = "GetPermanentBans"
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'temp' or 'perma'"})
		return
	}

	a.executeCommand(c, command, "")
}

// MessagePlayer sends a message to a player
func (a *API) MessagePlayer(c *gin.Context) {
	playerID := c.Param("id")

	var req struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "MessagePlayer", map[string]string{
		"PlayerId": playerID,
		"Message":  req.Message,
	})
}

// Punish Player
func (a *API) PunishPlayer(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "PunishPlayer", map[string]string{
		"PlayerId": req.PlayerID,
		"Reason":   req.Reason,
	})
}

// TempBan temporarily bans a player
func (a *API) TempBan(c *gin.Context) {
	var req struct {
		PlayerID  string `json:"player_id" binding:"required"`
		Duration  int    `json:"duration" binding:"required"` // hours
		Reason    string `json:"reason"`
		AdminName string `json:"admin_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "TemporaryBanPlayer", map[string]interface{}{
		"PlayerId":  req.PlayerID,
		"Duration":  req.Duration,
		"Reason":    req.Reason,
		"AdminName": req.AdminName,
	})
}

// PermaBan permanently bans a player
func (a *API) PermaBan(c *gin.Context) {
	var req struct {
		PlayerID  string `json:"player_id" binding:"required"`
		Reason    string `json:"reason"`
		AdminName string `json:"admin_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "PermanentBanPlayer", map[string]string{
		"PlayerId":  req.PlayerID,
		"Reason":    req.Reason,
		"AdminName": req.AdminName,
	})
}

// RemoveTempBan removes a temporary ban
func (a *API) RemoveTempBan(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveTemporaryBan", map[string]string{
		"PlayerId": req.PlayerID,
	})
}

// RemovePermaBan removes a permanent ban
func (a *API) RemovePermaBan(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemovePermanentBan", map[string]string{
		"PlayerId": req.PlayerID,
	})
}

// GetAdmins gets admin list
func (a *API) GetAdmins(c *gin.Context) {
	a.executeCommand(c, "GetAdminUsers", "")
}

// GetAdminGroups gets admin groups
func (a *API) GetAdminGroups(c *gin.Context) {
	a.executeCommand(c, "GetAdminGroups", "")
}

// AddAdmin adds an admin
func (a *API) AddAdmin(c *gin.Context) {
	var req struct {
		PlayerID   string `json:"player_id" binding:"required"`
		AdminGroup string `json:"admin_group" binding:"required"`
		Comment    string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "AddAdmin", map[string]string{
		"PlayerId":   req.PlayerID,
		"AdminGroup": req.AdminGroup,
		"Comment":    req.Comment,
	})
}

// RemoveAdmin removes an admin
func (a *API) RemoveAdmin(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveAdmin", map[string]string{
		"PlayerId": req.PlayerID,
	})
}

// ForceTeamSwitch forces a player to switch teams
func (a *API) ForceTeamSwitch(c *gin.Context) {
	var req struct {
		PlayerID  string `json:"player_id" binding:"required"`
		ForceMode int    `json:"force_mode" binding:"required"` // 0=on death, 1=immediately
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate ForceMode is 0 or 1
	if req.ForceMode != 0 && req.ForceMode != 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "force_mode must be 0 (on death) or 1 (immediately)"})
		return
	}

	a.executeCommand(c, "ForceTeamSwitch", map[string]interface{}{
		"PlayerId":  req.PlayerID,
		"ForceMode": req.ForceMode,
	})
}

// RemovePlayerFromSquad removes player from their squad
func (a *API) RemovePlayerFromSquad(c *gin.Context) {
	var req struct {
		PlayerID string `json:"player_id" binding:"required"`
		Reason   string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemovePlayerFromPlatoon", map[string]string{
		"PlayerId": req.PlayerID,
		"Reason":   req.Reason,
	})
}

// DisbandSquad disbands a squad
func (a *API) DisbandSquad(c *gin.Context) {
	var req struct {
		TeamIndex  int    `json:"team_index" binding:"required"`
		SquadIndex int    `json:"squad_index" binding:"required"`
		Reason     string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "DisbandPlatoon", map[string]interface{}{
		"TeamIndex":  req.TeamIndex,
		"SquadIndex": req.SquadIndex,
		"Reason":     req.Reason,
	})
}

// AddMapToRotation adds a map to rotation
func (a *API) AddMapToRotation(c *gin.Context) {
	var req struct {
		MapName string `json:"map_name" binding:"required"`
		Index   int    `json:"index"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "AddMapToRotation", map[string]interface{}{
		"MapName": req.MapName,
		"Index":   req.Index,
	})
}

// RemoveMapFromRotation removes a map from rotation
func (a *API) RemoveMapFromRotation(c *gin.Context) {
	var req struct {
		Index int `json:"index" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveMapFromRotation", map[string]interface{}{
		"Index": req.Index,
	})
}

// SetWelcomeMessage sets the server welcome message
func (a *API) SetWelcomeMessage(c *gin.Context) {
	var req struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetWelcomeMessage", map[string]string{
		"Message": req.Message,
	})
}

// GetProfanities gets banned words list
func (a *API) GetProfanities(c *gin.Context) {
	a.executeCommand(c, "GetServerInformation", map[string]string{
		"Name":  "bannedwords",
		"Value": "",
	})
}

// AddProfanities adds banned words
func (a *API) AddProfanities(c *gin.Context) {
	var req struct {
		BannedWords string `json:"banned_words" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "AddBannedWords", map[string]string{
		"BannedWords": req.BannedWords,
	})
}

// RemoveProfanities removes banned words
func (a *API) RemoveProfanities(c *gin.Context) {
	var req struct {
		BannedWords string `json:"banned_words" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveBannedWords", map[string]string{
		"BannedWords": req.BannedWords,
	})
}

// SetSectorLayout sets the objective sector layout
func (a *API) SetSectorLayout(c *gin.Context) {
	var req struct {
		Sector1 string `json:"sector_1" binding:"required"`
		Sector2 string `json:"sector_2" binding:"required"`
		Sector3 string `json:"sector_3" binding:"required"`
		Sector4 string `json:"sector_4" binding:"required"`
		Sector5 string `json:"sector_5" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetSectorLayout", map[string]string{
		"Sector_1": req.Sector1,
		"Sector_2": req.Sector2,
		"Sector_3": req.Sector3,
		"Sector_4": req.Sector4,
		"Sector_5": req.Sector5,
	})
}

// AddMapToSequence adds a map to the sequence
func (a *API) AddMapToSequence(c *gin.Context) {
	var req struct {
		MapName string `json:"map_name" binding:"required"`
		Index   int    `json:"index"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "AddMapToSequence", map[string]interface{}{
		"MapName": req.MapName,
		"Index":   req.Index,
	})
}

// RemoveMapFromSequence removes a map from the sequence
func (a *API) RemoveMapFromSequence(c *gin.Context) {
	var req struct {
		Index int `json:"index" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveMapFromSequence", map[string]interface{}{
		"Index": req.Index,
	})
}

// MoveMapInSequence moves a map in the sequence
func (a *API) MoveMapInSequence(c *gin.Context) {
	var req struct {
		CurrentIndex int `json:"current_index" binding:"required"`
		NewIndex     int `json:"new_index" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "MoveMapInSequence", map[string]interface{}{
		"CurrentIndex": req.CurrentIndex,
		"NewIndex":     req.NewIndex,
	})
}

// SetMapShuffleEnabled enables/disables map shuffle
func (a *API) SetMapShuffleEnabled(c *gin.Context) {
	var req struct {
		Enable bool `json:"enable" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetMapShuffleEnabled", map[string]interface{}{
		"Enable": req.Enable,
	})
}

// SetTeamSwitchCooldown sets the team switch cooldown
func (a *API) SetTeamSwitchCooldown(c *gin.Context) {
	var req struct {
		TeamSwitchTimer int `json:"team_switch_timer" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetTeamSwitchCooldown", map[string]interface{}{
		"TeamSwitchTimer": req.TeamSwitchTimer,
	})
}

// SetMaxQueuedPlayers sets max queued players
func (a *API) SetMaxQueuedPlayers(c *gin.Context) {
	var req struct {
		MaxQueuedPlayers int `json:"max_queued_players" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetMaxQueuedPlayers", map[string]interface{}{
		"MaxQueuedPlayers": req.MaxQueuedPlayers,
	})
}

// SetIdleKickDuration sets idle kick duration
func (a *API) SetIdleKickDuration(c *gin.Context) {
	var req struct {
		IdleTimeoutMinutes int `json:"idle_timeout_minutes" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetIdleKickDuration", map[string]interface{}{
		"IdleTimeoutMinutes": req.IdleTimeoutMinutes,
	})
}

// SetHighPingThreshold sets high ping threshold
func (a *API) SetHighPingThreshold(c *gin.Context) {
	var req struct {
		HighPingThresholdMs int `json:"high_ping_threshold_ms" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetHighPingThreshold", map[string]interface{}{
		"HighPingThresholdMs": req.HighPingThresholdMs,
	})
}

// SetVipSlotCount sets VIP slot count
func (a *API) SetVipSlotCount(c *gin.Context) {
	var req struct {
		VipSlotCount int `json:"vip_slot_count" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetVipSlotCount", map[string]interface{}{
		"VipSlotCount": req.VipSlotCount,
	})
}

// ResetVoteKickThreshold resets vote kick threshold to default
func (a *API) ResetVoteKickThreshold(c *gin.Context) {
	a.executeCommand(c, "ResetVoteKickThreshold", map[string]interface{}{})
}

// SetVoteKickEnabled enables/disables vote kick
func (a *API) SetVoteKickEnabled(c *gin.Context) {
	var req struct {
		Enable bool `json:"enable" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetVoteKickEnabled", map[string]interface{}{
		"Enable": req.Enable,
	})
}

// SetVoteKickThreshold sets vote kick threshold
func (a *API) SetVoteKickThreshold(c *gin.Context) {
	var req struct {
		ThresholdValue string `json:"threshold_value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetVoteKickThreshold", map[string]string{
		"ThresholdValue": req.ThresholdValue,
	})
}

// SetAutoBalanceEnabled enables/disables auto balance
func (a *API) SetAutoBalanceEnabled(c *gin.Context) {
	var req struct {
		Enable bool `json:"enable" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetAutoBalanceEnabled", map[string]interface{}{
		"Enable": req.Enable,
	})
}

// SetAutoBalanceThreshold sets auto balance threshold
func (a *API) SetAutoBalanceThreshold(c *gin.Context) {
	var req struct {
		AutoBalanceThreshold int `json:"auto_balance_threshold" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetAutoBalanceThreshold", map[string]interface{}{
		"AutoBalanceThreshold": req.AutoBalanceThreshold,
	})
}

// SetMatchTimer sets match timer for a game mode
func (a *API) SetMatchTimer(c *gin.Context) {
	var req struct {
		GameMode    string `json:"game_mode" binding:"required"`
		MatchLength int    `json:"match_length" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetMatchTimer", map[string]interface{}{
		"GameMode":    req.GameMode,
		"MatchLength": req.MatchLength,
	})
}

// RemoveMatchTimer removes match timer for a game mode
func (a *API) RemoveMatchTimer(c *gin.Context) {
	var req struct {
		GameMode string `json:"game_mode" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveMatchTimer", map[string]string{
		"GameMode": req.GameMode,
	})
}

// SetWarmupTimer sets warmup timer for a game mode
func (a *API) SetWarmupTimer(c *gin.Context) {
	var req struct {
		GameMode     string `json:"game_mode" binding:"required"`
		WarmupLength int    `json:"warmup_length" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetWarmupTimer", map[string]interface{}{
		"GameMode":     req.GameMode,
		"WarmupLength": req.WarmupLength,
	})
}

// RemoveWarmupTimer removes warmup timer for a game mode
func (a *API) RemoveWarmupTimer(c *gin.Context) {
	var req struct {
		GameMode string `json:"game_mode" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "RemoveWarmupTimer", map[string]string{
		"GameMode": req.GameMode,
	})
}

// SetDynamicWeatherEnabled enables/disables dynamic weather for a map
func (a *API) SetDynamicWeatherEnabled(c *gin.Context) {
	var req struct {
		MapId  string `json:"map_id" binding:"required"`
		Enable bool   `json:"enable" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	a.executeCommand(c, "SetDynamicWeatherEnabled", map[string]interface{}{
		"MapId":  req.MapId,
		"Enable": req.Enable,
	})
}

// GetDisplayableCommands gets list of all RCON commands
func (a *API) GetDisplayableCommands(c *gin.Context) {
	a.executeCommand(c, "GetDisplayableCommands", "")
}

// GetClientReferenceData gets reference data for a command
func (a *API) GetClientReferenceData(c *gin.Context) {
	commandID := c.Query("command")
	if commandID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "command parameter required"})
		return
	}

	a.executeCommand(c, "GetClientReferenceData", commandID)
}

// GetServerChangelist gets server changelist/build number
func (a *API) GetServerChangelist(c *gin.Context) {
	a.executeCommand(c, "GetServerChangelist", "")
}

// GetMapList returns the list of all available maps
func (a *API) GetMapList(c *gin.Context) {
	mapList := strings.Join(maps.List, "\n")
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(mapList))
}
