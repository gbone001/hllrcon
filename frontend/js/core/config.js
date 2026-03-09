// Configuration and static data
// Extracted from app.js lines 103-1533

// Developer mode commands (original 'commands' object from app.js)
export const developerCommands = {
    Connection: [
        {
            name: "ServerConnect",
            method: "GET",
            path: "/api/v2/connection/status",
            description:
                "Establishes an Rcon V2 connection with the server. Returns the XOR Key in the content body. (Handled automatically on connect)",
        },
        {
            name: "Login",
            method: "GET",
            path: "/api/v2/connection/status",
            description:
                "Authenticates a client to access the server. (Handled automatically on connect)",
        },
    ],
    "Server Information": [
        {
            name: "GetServerInformation",
            method: "GET",
            path: "/api/v2/server",
            description:
                "Retrieves various server information. Select type: players, player (requires Value=PlayerID), maprotation, mapsequence, session, serverconfig, bannedwords, vipplayers",
            fields: [
                {
                    name: "type",
                    type: "select",
                    options: [
                        "session",
                        "serverconfig",
                        "players",
                        "player",
                        "maprotation",
                        "mapsequence",
                        "bannedwords",
                        "vipplayers",
                    ],
                    placeholder: "Select information type",
                    conditionalFor: "value",
                    showWhen: ["player"],
                    description: "Type of information to retrieve",
                },
                {
                    name: "value",
                    type: "text",
                    placeholder: "Player ID (e.g. 76561198123456789)",
                    conditional: true,
                    description: "Value (required for 'player' type - use Player ID)",
                },
            ],
        },
        {
            name: "GetAdminLog",
            method: "GET",
            path: "/api/v2/logs",
            description:
                "Retrieve admin log for the specified interval time (seconds)",
            fields: [
                {
                    name: "seconds",
                    type: "number",
                    placeholder: "3600",
                    description: "How many seconds to look back in time",
                },
            ],
        },
        {
            name: "GetDisplayableCommands",
            method: "GET",
            path: "/api/v2/commands",
            description: "Retrieves the list of RCON commands",
        },
        {
            name: "GetClientReferenceData",
            method: "GET",
            path: "/api/v2/command-reference",
            description: "Retrieves argument details for a specific command",
            fields: [
                {
                    name: "command",
                    type: "text",
                    placeholder: "AddAdmin",
                    description: "Command ID to get reference data for",
                },
            ],
        },
        {
            name: "GetServerChangelist",
            method: "GET",
            path: "/api/v2/changelist",
            description: "Retrieves the change list build number for the server",
        },
        {
            name: "SetWelcomeMessage",
            method: "POST",
            path: "/api/v2/welcome-message",
            description: "Send a message to the server (sets welcome message)",
            fields: [
                {
                    name: "message",
                    type: "text",
                    placeholder: "Welcome to our server!",
                    description: "Welcome message to display to players",
                },
            ],
        },
        {
            name: "ServerBroadcast",
            method: "POST",
            path: "/api/v2/broadcast",
            description: "Create a message to broadcast to the server",
            fields: [
                {
                    name: "message",
                    type: "textarea",
                    placeholder: "Server restart in 5 minutes",
                    description: "Message to broadcast to all players",
                },
            ],
        },
    ],
    "Player Management": [
        {
            name: "MessagePlayer",
            method: "POST",
            path: "/api/v2/players/:id/message",
            description: "Sends a message to a specific player.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "message",
                    type: "text",
                    placeholder: "Your message here",
                },
            ],
        },
        {
            name: "PunishPlayer",
            method: "POST",
            path: "/api/v2/punish",
            description: "Punishes a player by killing their character.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Team killing" },
            ],
        },
        {
            name: "KickPlayer",
            method: "POST",
            path: "/api/v2/kick",
            description: "Kicks a player from the server.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Griefing" },
            ],
        },
        {
            name: "ForceTeamSwitch",
            method: "POST",
            path: "/api/v2/force-team-switch",
            description:
                "Forces a player to switch team. Can force a player to switch either on death or immediately.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "force_mode",
                    type: "select",
                    options: [
                        { value: "0", label: "0 - On Death" },
                        { value: "1", label: "1 - Immediately" },
                    ],
                    placeholder: "Select force mode",
                },
            ],
        },
        {
            name: "RemovePlayerFromPlatoon",
            method: "POST",
            path: "/api/v2/remove-from-squad",
            description: "Removes a player from their platoon.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Reason" },
            ],
        },
        {
            name: "DisbandPlatoon",
            method: "POST",
            path: "/api/v2/disband-squad",
            description: "Disbands a platoon and removes all players.",
            fields: [
                {
                    name: "team_index",
                    type: "number",
                    placeholder: "0",
                },
                { name: "squad_index", type: "number", placeholder: "0" },
                { name: "reason", type: "text", placeholder: "Reason" },
            ],
        },
    ],
    VIPs: [
        {
            name: "AddVip",
            method: "POST",
            path: "/api/v2/vips",
            description: "Gives a player VIP status.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "comment",
                    type: "text",
                    placeholder: "Tournament winner",
                },
            ],
        },
        {
            name: "RemoveVip",
            method: "DELETE",
            path: "/api/v2/vips",
            description: "Removes VIP status from a player.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
        {
            name: "SetVipSlotCount",
            method: "POST",
            path: "/api/v2/vip-slots",
            description: "Set the VIP slot count for the server.",
            fields: [{ name: "vip_slot_count", type: "number", placeholder: "10" }],
        },
    ],
    Admins: [
        {
            name: "GetAdminUsers",
            method: "GET",
            path: "/api/v2/admins",
            description: "Retrieves a list of all admin users.",
        },
        {
            name: "GetAdminGroups",
            method: "GET",
            path: "/api/v2/admin-groups",
            description: "Retrieves a list of all admin groups.",
        },
        {
            name: "AddAdmin",
            method: "POST",
            path: "/api/v2/admins",
            description: "Adds a player to an admin group.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "admin_group", type: "text", placeholder: "Moderator" },
                { name: "comment", type: "text", placeholder: "Trusted player" },
            ],
        },
        {
            name: "RemoveAdmin",
            method: "DELETE",
            path: "/api/v2/admins",
            description: "Removes the admin privileges from a player.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
    ],
    Bans: [
        {
            name: "GetPermanentBans",
            method: "GET",
            path: "/api/v2/bans?type=perma",
            description: "Retrieves a list of all permanent player bans.",
        },
        {
            name: "GetTemporaryBans",
            method: "GET",
            path: "/api/v2/bans?type=temp",
            description: "Retrieves a list of all temporary player bans.",
        },
        {
            name: "TemporaryBanPlayer",
            method: "POST",
            path: "/api/v2/temp-ban",
            description: "Bans a player from the server for a certain duration.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "duration",
                    type: "number",
                    placeholder: "24",
                },
                { name: "reason", type: "text", placeholder: "Team killing" },
                { name: "admin_name", type: "text", placeholder: "Your name" },
            ],
        },
        {
            name: "RemoveTemporaryBan",
            method: "DELETE",
            path: "/api/v2/temp-ban",
            description: "Removes a temporary ban from a player.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
        {
            name: "PermanentBanPlayer",
            method: "POST",
            path: "/api/v2/perma-ban",
            description: "Bans a player from a server permanently.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Cheating" },
                { name: "admin_name", type: "text", placeholder: "Your name" },
            ],
        },
        {
            name: "RemovePermanentBan",
            method: "DELETE",
            path: "/api/v2/perma-ban",
            description: "Removes a permanent ban from a player.",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
    ],
    Maps: [
        {
            name: "ChangeMap",
            method: "POST",
            path: "/api/v2/change-map",
            description: "Triggers a map change on the server.",
            fields: [
                {
                    name: "map_name",
                    type: "text",
                    placeholder: "carentan_warfare",
                },
            ],
        },
        {
            name: "SetSectorLayout",
            method: "POST",
            path: "/api/v2/sector-layout",
            description:
                "Triggers a map restart and sets the objectives to the specified sectors.",
            fields: [
                { name: "sector_1", type: "text", placeholder: "AAS_N_F1" },
                { name: "sector_2", type: "text", placeholder: "AAS_N_F2" },
                { name: "sector_3", type: "text", placeholder: "AAS_N_F3" },
                { name: "sector_4", type: "text", placeholder: "AAS_N_F4" },
                { name: "sector_5", type: "text", placeholder: "AAS_N_F5" },
            ],
        },
        {
            name: "AddMapToRotation",
            method: "POST",
            path: "/api/v2/map-rotation",
            description: "Adds a map to the map rotation at a specified index.",
            fields: [
                {
                    name: "map_name",
                    type: "text",
                    placeholder: "carentan_warfare",
                },
                { name: "index", type: "number", placeholder: "0" },
            ],
        },
        {
            name: "RemoveMapFromRotation",
            method: "DELETE",
            path: "/api/v2/map-rotation",
            description:
                "Removes a map from the rotation list at a specified index.",
            fields: [{ name: "index", type: "number", placeholder: "0" }],
        },
        {
            name: "AddMapToSequence",
            method: "POST",
            path: "/api/v2/map-sequence",
            description: "Adds a map to the map sequence at a specified index.",
            fields: [
                {
                    name: "map_name",
                    type: "text",
                    placeholder: "carentan_warfare",
                },
                { name: "index", type: "number", placeholder: "0" },
            ],
        },
        {
            name: "RemoveMapFromSequence",
            method: "DELETE",
            path: "/api/v2/map-sequence",
            description: "Remove a map from the map sequence at a specified index.",
            fields: [{ name: "index", type: "number", placeholder: "0" }],
        },
        {
            name: "SetMapShuffleEnabled",
            method: "POST",
            path: "/api/v2/map-shuffle",
            description: "Randomises the map sequence.",
            fields: [{ name: "enable", type: "checkbox", default: true }],
        },
        {
            name: "MoveMapInSequence",
            method: "PUT",
            path: "/api/v2/map-sequence/move",
            description: "Moves a current map in the sequence to another location.",
            fields: [
                { name: "current_index", type: "number", placeholder: "0" },
                { name: "new_index", type: "number", placeholder: "1" },
            ],
        },
    ],
    "Server Settings": [
        {
            name: "SetTeamSwitchCooldown",
            method: "POST",
            path: "/api/v2/team-switch-cooldown",
            description:
                "Sets the cooldown time for allowing players to switch teams.",
            fields: [
                { name: "team_switch_timer", type: "number", placeholder: "180" },
            ],
        },
        {
            name: "SetMaxQueuedPlayers",
            method: "POST",
            path: "/api/v2/max-queued-players",
            description:
                "Sets the max number of players allowed to queue for the server.",
            fields: [
                { name: "max_queued_players", type: "number", placeholder: "10" },
            ],
        },
        {
            name: "SetIdleKickDuration",
            method: "POST",
            path: "/api/v2/idle-kick-duration",
            description: "Sets the duration for kicking players for idling.",
            fields: [
                {
                    name: "idle_timeout_minutes",
                    type: "number",
                    placeholder: "15",
                },
            ],
        },
        {
            name: "SetHighPingThreshold",
            method: "POST",
            path: "/api/v2/high-ping-threshold",
            description: "Sets the threshold for players with high ping.",
            fields: [
                {
                    name: "high_ping_threshold_ms",
                    type: "number",
                    placeholder: "250",
                },
            ],
        },
        {
            name: "SetAutoBalanceEnabled",
            method: "POST",
            path: "/api/v2/auto-balance/enabled",
            description: "Enables or disables team auto balancing for the sever.",
            fields: [{ name: "enable", type: "checkbox", default: true }],
        },
        {
            name: "SetAutoBalanceThreshold",
            method: "POST",
            path: "/api/v2/auto-balance/threshold",
            description:
                "Sets the player threshold number for team auto balancing.",
            fields: [
                {
                    name: "auto_balance_threshold",
                    type: "number",
                    placeholder: "5",
                },
            ],
        },
        {
            name: "ResetVoteKickThreshold",
            method: "POST",
            path: "/api/v2/vote-kick/reset",
            description: "Resets the vote to kick threshold.",
            fields: [],
        },
        {
            name: "SetVoteKickEnabled",
            method: "POST",
            path: "/api/v2/vote-kick/enabled",
            description: "Enables or disables the vote to kick functionality.",
            fields: [{ name: "enable", type: "checkbox", default: true }],
        },
        {
            name: "SetVoteKickThreshold",
            method: "POST",
            path: "/api/v2/vote-kick/threshold",
            description: "Sets the vote to kick threshold.",
            fields: [
                {
                    name: "threshold_value",
                    type: "text",
                    placeholder: "1,10,10,5",
                },
            ],
        },
        {
            name: "AddBannedWords",
            method: "POST",
            path: "/api/v2/profanities",
            description:
                "Adds words to the custom profanity filter. Words should be separated with a comma.",
            fields: [
                {
                    name: "banned_words",
                    type: "text",
                    placeholder: "word1,word2,word3",
                },
            ],
        },
        {
            name: "RemoveBannedWords",
            method: "DELETE",
            path: "/api/v2/profanities",
            description:
                "Removes words from the custom profanity filter. Words should be separated with a comma.",
            fields: [
                {
                    name: "banned_words",
                    type: "text",
                    placeholder: "word1,word2",
                },
            ],
        },
    ],
    "Match Timers": [
        {
            name: "SetMatchTimer",
            method: "POST",
            path: "/api/v2/match-timer",
            description:
                "Sets the match time of a specified game mode in minutes. For offensive the match timer is the length of each control point phase. Match timers are limited to the following ranges: Warfare: 30-180 minutes, Offensive: 10-60 minutes, Skirmish: 10-60 minutes.",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Offensive", "Skirmish"],
                    placeholder: "Select game mode",
                },
                { name: "match_length", type: "number", placeholder: "90" },
            ],
        },
        {
            name: "RemoveMatchTimer",
            method: "DELETE",
            path: "/api/v2/match-timer",
            description:
                "Removes the custom match timers for the specified game mode.",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Offensive", "Skirmish"],
                    placeholder: "Select game mode",
                },
            ],
        },
        {
            name: "SetWarmupTimer",
            method: "POST",
            path: "/api/v2/warmup-timer",
            description:
                "Sets the warmup timer for a specified game mode in minutes. Only supports Warfare and Skirmish. Warmup timers are limited to the following ranges: 1-10 Minutes.",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Skirmish"],
                    placeholder: "Select game mode",
                },
                { name: "warmup_length", type: "number", placeholder: "5" },
            ],
        },
        {
            name: "RemoveWarmupTimer",
            method: "DELETE",
            path: "/api/v2/warmup-timer",
            description:
                "Removes the custom warmup timer for a specified game mode.",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Skirmish"],
                    placeholder: "Select game mode",
                },
            ],
        },
        {
            name: "SetDynamicWeatherEnabled",
            method: "POST",
            path: "/api/v2/dynamic-weather",
            description:
                "Enables or disabled dynamic weather for a specific map. Command only functions for maps that use the dynamic weather system.",
            fields: [
                { name: "map_id", type: "text", placeholder: "carentan_warfare" },
                { name: "enable", type: "checkbox", default: true },
            ],
        },
    ],
};

// User-friendly command groupings (original 'userFriendlyCommands' object from app.js)
export const userFriendlyCommands = {
    "Quick Actions": [
        {
            name: "📢・Broadcast Message",
            method: "POST",
            path: "/api/v2/broadcast",
            description: "Send a message to all players on the server",
            fields: [
                {
                    name: "message",
                    type: "textarea",
                    placeholder: "Server restart in 5 minutes",
                    description: "Message to broadcast to all players",
                },
            ],
        },
        {
            name: "🗺️・Change Map",
            method: "POST",
            path: "/api/v2/change-map",
            description: "Change to a different map immediately",
            fields: [
                {
                    name: "map_name",
                    type: "text",
                    placeholder: "carentan_warfare",
                },
            ],
        },
        {
            name: "👋・Set Welcome Message",
            method: "POST",
            path: "/api/v2/welcome-message",
            description: "Set the message that players see when joining",
            fields: [
                {
                    name: "message",
                    type: "text",
                    placeholder: "Welcome to our server!",
                    description: "Welcome message to display to players",
                },
            ],
        },
    ],
    "Player Actions": [
        {
            name: "💬・Message Player",
            method: "POST",
            path: "/api/v2/players/:id/message",
            description: "Send a private message to a specific player",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "message",
                    type: "text",
                    placeholder: "Your message here",
                },
            ],
        },
        {
            name: "👢・Kick Player",
            method: "POST",
            path: "/api/v2/kick",
            description: "Remove a player from the server",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Griefing" },
            ],
        },
        {
            name: "⚠️・Punish Player",
            method: "POST",
            path: "/api/v2/punish",
            description: "Kill a player's character as punishment",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Team killing" },
            ],
        },
        {
            name: "🔄・Switch Player Team",
            method: "POST",
            path: "/api/v2/force-team-switch",
            description: "Force a player to switch to the opposite team",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "force_mode",
                    type: "select",
                    options: [
                        { value: "0", label: "0 - On Death" },
                        { value: "1", label: "1 - Immediately" },
                    ],
                    placeholder: "Select force mode",
                },
            ],
        },
        {
            name: "👥・Remove from Squad",
            method: "POST",
            path: "/api/v2/remove-from-squad",
            description: "Remove a player from their current squad",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Reason" },
            ],
        },
        {
            name: "💥・Disband Squad",
            method: "POST",
            path: "/api/v2/disband-squad",
            description: "Disband a squad and remove all its members",
            fields: [
                {
                    name: "team_index",
                    type: "number",
                    placeholder: "0",
                },
                { name: "squad_index", type: "number", placeholder: "0" },
                { name: "reason", type: "text", placeholder: "Reason" },
            ],
        },
    ],
    "Bans": [
        {
            name: "⏰・Temporary Ban",
            method: "POST",
            path: "/api/v2/temp-ban",
            description: "Ban a player temporarily",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "duration",
                    type: "number",
                    placeholder: "24 (hours)",
                },
                { name: "reason", type: "text", placeholder: "Team killing" },
                { name: "admin_name", type: "text", placeholder: "Your name" },
            ],
        },
        {
            name: "🚫・Permanent Ban",
            method: "POST",
            path: "/api/v2/perma-ban",
            description: "Ban a player permanently from the server",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "reason", type: "text", placeholder: "Cheating" },
                { name: "admin_name", type: "text", placeholder: "Your name" },
            ],
        },
        {
            name: "📋・View Temporary Bans",
            method: "GET",
            path: "/api/v2/bans?type=temp",
            description: "See all temporary bans",
        },
        {
            name: "📋・View Permanent Bans",
            method: "GET",
            path: "/api/v2/bans?type=perma",
            description: "See all permanent bans",
        },
        {
            name: "✅・Remove Temporary Ban",
            method: "DELETE",
            path: "/api/v2/temp-ban",
            description: "Unban a temporarily banned player",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
        {
            name: "✅・Remove Permanent Ban",
            method: "DELETE",
            path: "/api/v2/perma-ban",
            description: "Unban a permanently banned player",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
    ],
    "VIP Management": [
        {
            name: "⭐・Add VIP",
            method: "POST",
            path: "/api/v2/vips",
            description: "Grant VIP status to a player",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                {
                    name: "comment",
                    type: "text",
                    placeholder: "Tournament winner",
                },
            ],
        },
        {
            name: "❌・Remove VIP",
            method: "DELETE",
            path: "/api/v2/vips",
            description: "Remove VIP status from a player",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
        {
            name: "👑・View VIP Players",
            method: "GET",
            path: "/api/v2/server?type=vipplayers",
            description: "See all players with VIP status",
        },
        {
            name: "🎫・Set VIP Slots",
            method: "POST",
            path: "/api/v2/vip-slots",
            description: "Set how many VIP slots the server has",
            fields: [{ name: "vip_slot_count", type: "number", placeholder: "10" }],
        },
    ],
    "Admin Management": [
        {
            name: "👮・Add Admin",
            method: "POST",
            path: "/api/v2/admins",
            description: "Grant admin privileges to a player",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
                { name: "admin_group", type: "text", placeholder: "Moderator" },
                { name: "comment", type: "text", placeholder: "Trusted player" },
            ],
        },
        {
            name: "❌・Remove Admin",
            method: "DELETE",
            path: "/api/v2/admins",
            description: "Remove admin privileges from a player",
            fields: [
                {
                    name: "player_id",
                    type: "text",
                    placeholder: "76561198123456789",
                },
            ],
        },
        {
            name: "👮・View Admins",
            method: "GET",
            path: "/api/v2/admins",
            description: "See all server admins",
        },
        {
            name: "👥・View Admin Groups",
            method: "GET",
            path: "/api/v2/admin-groups",
            description: "See all admin permission groups",
        },
    ],
    "Server Info": [
        {
            name: "👥・View Players",
            method: "GET",
            path: "/api/v2/server?type=players",
            description: "See all players currently on the server",
        },
        {
            name: "👤・View Player Details",
            method: "GET",
            path: "/api/v2/server",
            description: "Get detailed information about a specific player",
            fields: [
                {
                    name: "type",
                    type: "select",
                    options: ["player"],
                    placeholder: "Select information type",
                    conditionalFor: "value",
                    showWhen: ["player"],
                    description: "Type of information to retrieve",
                },
                {
                    name: "value",
                    type: "text",
                    placeholder: "Player ID (e.g. 76561198123456789)",
                    conditional: true,
                    description: "Value (required for 'player' type - use Player ID)",
                },
            ],
        },
        {
            name: "📊・Server Status",
            method: "GET",
            path: "/api/v2/server?type=session",
            description: "View current server session information",
        },
        {
            name: "⚙️・Server Config",
            method: "GET",
            path: "/api/v2/server?type=serverconfig",
            description: "View server configuration settings",
        },
        {
            name: "📜・Admin Logs",
            method: "GET",
            path: "/api/v2/logs",
            description: "View recent admin actions",
            fields: [
                {
                    name: "seconds",
                    type: "number",
                    placeholder: "60 (minutes to look back)",
                    convertToSeconds: true,
                },
            ],
        },
    ],
    "Map Management": [
        {
            name: "🔁・View Map Rotation",
            method: "GET",
            path: "/api/v2/server?type=maprotation",
            description: "See the current map rotation",
        },
        {
            name: "📋・View Map Sequence",
            method: "GET",
            path: "/api/v2/server?type=mapsequence",
            description: "See the current map sequence",
        },
        {
            name: "➕・Add Map to Rotation",
            method: "POST",
            path: "/api/v2/map-rotation",
            description: "Add a map to the rotation",
            fields: [
                {
                    name: "map_name",
                    type: "text",
                    placeholder: "carentan_warfare",
                },
                { name: "index", type: "number", placeholder: "0" },
            ],
        },
        {
            name: "➖・Remove Map from Rotation",
            method: "DELETE",
            path: "/api/v2/map-rotation",
            description: "Remove a map from the rotation",
            fields: [{ name: "index", type: "number", placeholder: "0" }],
        },
        {
            name: "➕・Add Map to Sequence",
            method: "POST",
            path: "/api/v2/map-sequence",
            description: "Add a map to the sequence",
            fields: [
                {
                    name: "map_name",
                    type: "text",
                    placeholder: "carentan_warfare",
                },
                { name: "index", type: "number", placeholder: "0" },
            ],
        },
        {
            name: "➖・Remove Map from Sequence",
            method: "DELETE",
            path: "/api/v2/map-sequence",
            description: "Remove a map from the sequence",
            fields: [{ name: "index", type: "number", placeholder: "0" }],
        },
        {
            name: "↕️・Move Map in Sequence",
            method: "PUT",
            path: "/api/v2/map-sequence/move",
            description: "Reorder maps in the sequence",
            fields: [
                { name: "current_index", type: "number", placeholder: "0" },
                { name: "new_index", type: "number", placeholder: "1" },
            ],
        },
        {
            name: "🔀・Enable/Disable Map Shuffle",
            method: "POST",
            path: "/api/v2/map-shuffle",
            description: "Randomize the map sequence",
            fields: [{ name: "enable", type: "checkbox", default: true }],
        },
        {
            name: "🎯・Set Sector Layout",
            method: "POST",
            path: "/api/v2/sector-layout",
            description: "Set objectives for the current map",
            fields: [
                { name: "sector_1", type: "text", placeholder: "AAS_N_F1" },
                { name: "sector_2", type: "text", placeholder: "AAS_N_F2" },
                { name: "sector_3", type: "text", placeholder: "AAS_N_F3" },
                { name: "sector_4", type: "text", placeholder: "AAS_N_F4" },
                { name: "sector_5", type: "text", placeholder: "AAS_N_F5" },
            ],
        },
    ],
    "Server Settings": [
        {
            name: "⏱️・Team Switch Cooldown",
            method: "POST",
            path: "/api/v2/team-switch-cooldown",
            description: "Set how long players must wait to switch teams",
            fields: [
                { name: "team_switch_timer", type: "number", placeholder: "3 (minutes)", convertToSeconds: true },
            ],
        },
        {
            name: "🚪・Max Queue Size",
            method: "POST",
            path: "/api/v2/max-queued-players",
            description: "Set maximum number of players that can queue",
            fields: [
                { name: "max_queued_players", type: "number", placeholder: "10" },
            ],
        },
        {
            name: "💤・Idle Kick Timer",
            method: "POST",
            path: "/api/v2/idle-kick-duration",
            description: "Set how long before idle players are kicked",
            fields: [
                {
                    name: "idle_timeout_minutes",
                    type: "number",
                    placeholder: "15 (minutes)",
                },
            ],
        },
        {
            name: "📶・High Ping Threshold",
            method: "POST",
            path: "/api/v2/high-ping-threshold",
            description: "Set the ping threshold for warnings",
            fields: [
                {
                    name: "high_ping_threshold_ms",
                    type: "number",
                    placeholder: "250 (milliseconds)",
                },
            ],
        },
        {
            name: "⚖️・Auto Balance",
            method: "POST",
            path: "/api/v2/auto-balance/enabled",
            description: "Enable or disable team auto-balancing",
            fields: [{ name: "enable", type: "checkbox", default: true }],
        },
        {
            name: "⚖️・Auto Balance Threshold",
            method: "POST",
            path: "/api/v2/auto-balance/threshold",
            description: "Set player difference threshold for auto-balance",
            fields: [
                {
                    name: "auto_balance_threshold",
                    type: "number",
                    placeholder: "5",
                },
            ],
        },
        {
            name: "🗳️・Vote Kick",
            method: "POST",
            path: "/api/v2/vote-kick/enabled",
            description: "Enable or disable vote kick functionality",
            fields: [{ name: "enable", type: "checkbox", default: true }],
        },
        {
            name: "🗳️・Vote Kick Threshold",
            method: "POST",
            path: "/api/v2/vote-kick/threshold",
            description: "Set the vote kick threshold values",
            fields: [
                {
                    name: "threshold_value",
                    type: "text",
                    placeholder: "1,10,10,5",
                },
            ],
        },
        {
            name: "🔄・Reset Vote Kick Threshold",
            method: "POST",
            path: "/api/v2/vote-kick/reset",
            description: "Reset vote kick threshold to default values",
            fields: [],
        },
        {
            name: "🚫・Add Banned Words",
            method: "POST",
            path: "/api/v2/profanities",
            description: "Add words to the profanity filter",
            fields: [
                {
                    name: "banned_words",
                    type: "text",
                    placeholder: "word1,word2,word3 (comma-separated)",
                },
            ],
        },
        {
            name: "✅・Remove Banned Words",
            method: "DELETE",
            path: "/api/v2/profanities",
            description: "Remove words from the profanity filter",
            fields: [
                {
                    name: "banned_words",
                    type: "text",
                    placeholder: "word1,word2 (comma-separated)",
                },
            ],
        },
        {
            name: "📝・View Banned Words",
            method: "GET",
            path: "/api/v2/server?type=bannedwords",
            description: "See all banned words",
        },
        {
            name: "⏰・Set Match Timer",
            method: "POST",
            path: "/api/v2/match-timer",
            description: "Set match duration for a game mode",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Offensive", "Skirmish"],
                    placeholder: "Select game mode",
                },
                { name: "match_length", type: "number", placeholder: "90 (minutes)" },
            ],
        },
        {
            name: "❌・Remove Match Timer",
            method: "DELETE",
            path: "/api/v2/match-timer",
            description: "Remove custom match timer for a game mode",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Offensive", "Skirmish"],
                    placeholder: "Select game mode",
                },
            ],
        },
        {
            name: "🔥・Set Warmup Timer",
            method: "POST",
            path: "/api/v2/warmup-timer",
            description: "Set warmup duration for a game mode",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Skirmish"],
                    placeholder: "Select game mode",
                },
                { name: "warmup_length", type: "number", placeholder: "5 (minutes)" },
            ],
        },
        {
            name: "❌・Remove Warmup Timer",
            method: "DELETE",
            path: "/api/v2/warmup-timer",
            description: "Remove custom warmup timer for a game mode",
            fields: [
                {
                    name: "game_mode",
                    type: "select",
                    options: ["Warfare", "Skirmish"],
                    placeholder: "Select game mode",
                },
            ],
        },
    ],
    "Advanced": [
        {
            name: "🌦️・Dynamic Weather",
            method: "POST",
            path: "/api/v2/dynamic-weather",
            description: "Enable or disable dynamic weather for a map",
            fields: [
                { name: "map_id", type: "text", placeholder: "carentan_warfare" },
                { name: "enable", type: "checkbox", default: true },
            ],
        },
        {
            name: "📋・Get Commands List",
            method: "GET",
            path: "/api/v2/commands",
            description: "Retrieve the list of available RCON commands",
        },
        {
            name: "📖・Get Command Reference",
            method: "GET",
            path: "/api/v2/command-reference",
            description: "Get detailed information about a specific command",
            fields: [
                {
                    name: "command",
                    type: "text",
                    placeholder: "AddAdmin",
                    description: "Command ID to get reference data for",
                },
            ],
        },
        {
            name: "🔢・Get Server Build",
            method: "GET",
            path: "/api/v2/changelist",
            description: "Get the server's build/changelist number",
        },
    ],
};

// Success message mapping for user-friendly mode (by command name)
export const successMessages = {
    // User-friendly mode (with emojis)
    "💬・Message Player": "✅ Message sent to player",
    "👢・Kick Player": "✅ Player kicked successfully",
    "⚠️・Punish Player": "✅ Player punished",
    "🔄・Switch Player Team": "✅ Player team switch initiated",
    "👥・Remove from Squad": "✅ Player removed from squad",
    "💥・Disband Squad": "✅ Squad disbanded",
    "⏰・Temporary Ban": "✅ Player temporarily banned",
    "🚫・Permanent Ban": "✅ Player permanently banned",
    "✅・Remove Temporary Ban": "✅ Temporary ban removed",
    "✅・Remove Permanent Ban": "✅ Permanent ban removed",
    "⭐・Add VIP": "✅ VIP added successfully",
    "❌・Remove VIP": "✅ VIP removed successfully",
    "🎫・Set VIP Slots": "✅ VIP slot count updated",
    "👮・Add Admin": "✅ Admin added successfully",
    "❌・Remove Admin": "✅ Admin removed successfully",
    "📢・Broadcast Message": "✅ Message broadcast to server",
    "👋・Set Welcome Message": "✅ Welcome message updated",
    "🗺️・Change Map": "✅ Map change initiated",
    "➕・Add Map to Rotation": "✅ Map added to rotation",
    "➖・Remove Map from Rotation": "✅ Map removed from rotation",
    "➕・Add Map to Sequence": "✅ Map added to sequence",
    "➖・Remove Map from Sequence": "✅ Map removed from sequence",
    "↕️・Move Map in Sequence": "✅ Map position updated",
    "🔀・Enable/Disable Map Shuffle": "✅ Map shuffle setting updated",
    "🎯・Set Sector Layout": "✅ Sector layout updated",
    "⏱️・Team Switch Cooldown": "✅ Team switch cooldown updated",
    "🚪・Max Queue Size": "✅ Max queue size updated",
    "💤・Idle Kick Timer": "✅ Idle kick duration updated",
    "📶・High Ping Threshold": "✅ High ping threshold updated",
    "⚖️・Auto Balance": "✅ Auto-balance setting updated",
    "⚖️・Auto Balance Threshold": "✅ Auto-balance threshold updated",
    "🗳️・Vote Kick": "✅ Vote kick setting updated",
    "🗳️・Vote Kick Threshold": "✅ Vote kick threshold updated",
    "🔄・Reset Vote Kick Threshold": "✅ Vote kick threshold reset to default",
    "🚫・Add Banned Words": "✅ Banned words added",
    "✅・Remove Banned Words": "✅ Banned words removed",
    "⏰・Set Match Timer": "✅ Match timer updated",
    "❌・Remove Match Timer": "✅ Match timer removed",
    "🔥・Set Warmup Timer": "✅ Warmup timer updated",
    "❌・Remove Warmup Timer": "✅ Warmup timer removed",
    "🌦️・Dynamic Weather": "✅ Dynamic weather setting updated",

    // Developer mode (camelCase names)
    "MessagePlayer": "✅ Message sent to player",
    "KickPlayer": "✅ Player kicked successfully",
    "PunishPlayer": "✅ Player punished",
    "ForceTeamSwitch": "✅ Player team switch initiated",
    "RemovePlayerFromPlatoon": "✅ Player removed from squad",
    "DisbandPlatoon": "✅ Squad disbanded",
    "TemporaryBanPlayer": "✅ Player temporarily banned",
    "PermanentBanPlayer": "✅ Player permanently banned",
    "RemoveTemporaryBan": "✅ Temporary ban removed",
    "RemovePermanentBan": "✅ Permanent ban removed",
    "AddVip": "✅ VIP added successfully",
    "RemoveVip": "✅ VIP removed successfully",
    "SetVipSlotCount": "✅ VIP slot count updated",
    "AddAdmin": "✅ Admin added successfully",
    "RemoveAdmin": "✅ Admin removed successfully",
    "ServerBroadcast": "✅ Message broadcast to server",
    "SetWelcomeMessage": "✅ Welcome message updated",
    "ChangeMap": "✅ Map change initiated",
    "AddMapToRotation": "✅ Map added to rotation",
    "RemoveMapFromRotation": "✅ Map removed from rotation",
    "AddMapToSequence": "✅ Map added to sequence",
    "RemoveMapFromSequence": "✅ Map removed from sequence",
    "MoveMapInSequence": "✅ Map position updated",
    "SetMapShuffleEnabled": "✅ Map shuffle setting updated",
    "SetSectorLayout": "✅ Sector layout updated",
    "SetTeamSwitchCooldown": "✅ Team switch cooldown updated",
    "SetMaxQueuedPlayers": "✅ Max queue size updated",
    "SetIdleKickDuration": "✅ Idle kick duration updated",
    "SetHighPingThreshold": "✅ High ping threshold updated",
    "SetAutoBalanceEnabled": "✅ Auto-balance setting updated",
    "SetAutoBalanceThreshold": "✅ Auto-balance threshold updated",
    "SetVoteKickEnabled": "✅ Vote kick setting updated",
    "SetVoteKickThreshold": "✅ Vote kick threshold updated",
    "ResetVoteKickThreshold": "✅ Vote kick threshold reset to default",
    "AddBannedWords": "✅ Banned words added",
    "RemoveBannedWords": "✅ Banned words removed",
    "SetMatchTimer": "✅ Match timer updated",
    "RemoveMatchTimer": "✅ Match timer removed",
    "SetWarmupTimer": "✅ Warmup timer updated",
    "RemoveWarmupTimer": "✅ Warmup timer removed",
    "SetDynamicWeatherEnabled": "✅ Dynamic weather setting updated",
};

// Application configuration constants
export const APP_CONFIG = {
    DEFAULT_THEME: 'dark',
    DEFAULT_DEVELOPER_MODE: false,
    API_BASE_URL: '/api/v2',
    STORAGE_KEYS: {
        THEME: 'theme',
        DEVELOPER_MODE: 'developerMode',
        RECENT_SERVERS: 'recentServers',
        RECENT_SERVERS_ENCRYPTED: 'recentServersEncrypted',
        CREDENTIAL_VAULT_SALT: 'credentialVaultSalt'
    }
};
