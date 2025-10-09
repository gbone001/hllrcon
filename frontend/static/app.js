let connected = false;
let hostVisible = false;

// Theme management
function toggleTheme() {
    const body = document.body;
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');

    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');

    // Toggle icons
    if (isDark) {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }

    // Save preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Load theme preference on startup
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark theme unless explicitly set to light
    const shouldUseDark = savedTheme !== 'light';

    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');

    if (!shouldUseDark) {
        // Only modify if light theme is preferred
        document.body.classList.remove('dark-theme');
        if (sunIcon && moonIcon) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }
    // Dark theme is already applied in HTML, so no need to add it again
}

// Load theme as early as possible to avoid flash
loadThemePreference();

const commands = {
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

function initializeCommands() {
    const container = document.getElementById("commandsList");

    for (const [section, cmds] of Object.entries(commands)) {
        const sectionDiv = document.createElement("div");
        sectionDiv.className = "command-section";

        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = section;
        sectionDiv.appendChild(sectionTitle);

        cmds.forEach((cmd, idx) => {
            const cmdId = `cmd-${section.replace(/\s+/g, "-")}-${idx}`;
            const item = document.createElement("div");
            item.className = "command-item";

            const header = document.createElement("div");
            header.className = "command-header";

            const title = document.createElement("span");
            title.className = "command-title";
            title.textContent = cmd.name;

            const method = document.createElement("span");
            method.className = `command-method method-${cmd.method.toLowerCase()}`;
            method.textContent = cmd.method;

            header.appendChild(title);
            header.appendChild(method);

            // All commands are expandable
            header.onclick = () => toggleCommandBody(cmdId);

            const body = document.createElement("div");
            body.className = "command-body";
            body.id = cmdId;

            // Add command description if available
            if (cmd.description) {
                const desc = document.createElement("p");
                desc.style.cssText =
                    "margin-bottom: 15px; color: #adadad; font-size: 13px; font-style: italic;";
                desc.textContent = cmd.description;
                body.appendChild(desc);
            }

            if (cmd.fields && cmd.fields.length > 0) {
                cmd.fields.forEach((field) => {
                    const formGroup = document.createElement("div");
                    formGroup.className = "form-group";
                    formGroup.id = `${cmdId}-${field.name}-group`;

                    // Hide conditional fields by default
                    if (field.conditional) {
                        formGroup.style.display = "none";
                    }

                    const label = document.createElement("label");
                    const labelText = field.name
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase());
                    label.textContent = labelText;

                    formGroup.appendChild(label);

                    if (field.type === "select") {
                        const select = document.createElement("select");
                        select.id = `${cmdId}-${field.name}`;

                        // Add placeholder option
                        if (field.placeholder) {
                            const placeholderOption = document.createElement("option");
                            placeholderOption.value = "";
                            placeholderOption.textContent = field.placeholder;
                            placeholderOption.disabled = true;
                            placeholderOption.selected = true;
                            select.appendChild(placeholderOption);
                        }

                        // Add options
                        if (field.options && field.options.length > 0) {
                            field.options.forEach((opt) => {
                                const option = document.createElement("option");
                                // Support both string options and {value, label} objects
                                if (typeof opt === "object") {
                                    option.value = opt.value;
                                    option.textContent = opt.label;
                                } else {
                                    option.value = opt;
                                    option.textContent = opt;
                                }
                                select.appendChild(option);
                            });
                        }

                        // Handle conditional fields
                        if (field.conditionalFor) {
                            select.addEventListener("change", (e) => {
                                const conditionalFieldId = `${cmdId}-${field.conditionalFor}-group`;
                                const conditionalGroup =
                                    document.getElementById(conditionalFieldId);
                                if (conditionalGroup) {
                                    if (
                                        field.showWhen &&
                                        field.showWhen.includes(e.target.value)
                                    ) {
                                        conditionalGroup.style.display = "block";
                                    } else {
                                        conditionalGroup.style.display = "none";
                                    }
                                }
                            });
                        }

                        formGroup.appendChild(select);
                    } else if (field.type === "textarea") {
                        const textarea = document.createElement("textarea");
                        textarea.id = `${cmdId}-${field.name}`;
                        textarea.placeholder = field.placeholder || "";
                        textarea.rows = 3;
                        formGroup.appendChild(textarea);
                    } else if (field.type === "checkbox") {
                        const checkbox = document.createElement("input");
                        checkbox.type = "checkbox";
                        checkbox.id = `${cmdId}-${field.name}`;
                        checkbox.checked = field.default || false;
                        formGroup.appendChild(checkbox);
                    } else {
                        // Check if this is a map-related field
                        const isMapField = field.name === "map_name" || field.name === "map_id";

                        if (isMapField) {
                            // Create a select dropdown for maps
                            const select = document.createElement("select");
                            select.id = `${cmdId}-${field.name}`;

                            // Add placeholder option
                            const placeholderOption = document.createElement("option");
                            placeholderOption.value = "";
                            placeholderOption.textContent = field.placeholder || "Select a map...";
                            placeholderOption.disabled = true;
                            placeholderOption.selected = true;
                            select.appendChild(placeholderOption);

                            // Add map options (will be populated after maps are loaded)
                            if (mapList.length > 0) {
                                mapList.forEach(map => {
                                    const option = document.createElement("option");
                                    option.value = map;
                                    option.textContent = map;
                                    select.appendChild(option);
                                });
                            } else {
                                // Maps will be loaded, mark this select for later population
                                select.classList.add("map-select-pending");
                            }

                            formGroup.appendChild(select);
                        } else {
                            const input = document.createElement("input");
                            input.type = field.type || "text";
                            input.id = `${cmdId}-${field.name}`;
                            input.placeholder = field.placeholder || "";
                            formGroup.appendChild(input);
                        }
                    }

                    body.appendChild(formGroup);
                });
            }

            // Add send button (full width, centered)
            const btnWrapper = document.createElement("div");
            btnWrapper.className = "command-button-wrapper";
            const btn = document.createElement("button");
            btn.className = "command-button";
            btn.textContent = "Send Command";
            btn.onclick = () =>
                cmd.fields && cmd.fields.length > 0
                    ? executeCommandWithForm(cmd, cmdId)
                    : executeCommand(cmd);
            btnWrapper.appendChild(btn);
            body.appendChild(btnWrapper);

            item.appendChild(body);

            item.insertBefore(header, item.firstChild);
            sectionDiv.appendChild(item);
        });

        container.appendChild(sectionDiv);
    }
}

function toggleCommandBody(id) {
    const body = document.getElementById(id);
    const isCurrentlyExpanded = body.classList.contains("expanded");

    // Close all command bodies
    const allCommandBodies = document.querySelectorAll('.command-body');
    allCommandBodies.forEach(cmdBody => {
        cmdBody.classList.remove("expanded");
    });

    // If the clicked command wasn't expanded, expand it
    if (!isCurrentlyExpanded) {
        body.classList.add("expanded");
    }
}

async function executeCommand(cmd, bodyData = null) {
    if (!connected) {
        showResponse("Error: Not connected to server", true);
        return;
    }

    showResponse("Executing...", false);

    try {
        let path = cmd.path;
        const options = {
            method: cmd.method,
            credentials: "include",
            headers: {},
        };

        // Replace path parameters with actual values
        if (bodyData && path.includes(":")) {
            // Find all :param patterns in the path
            const paramMatches = path.match(/:[a-zA-Z_]+/g);
            if (paramMatches) {
                paramMatches.forEach((param) => {
                    const paramName = param.substring(1); // Remove the ':'

                    // Check if we have a field that matches this path param
                    // Common mappings: :id -> player_id, :index -> index, etc.
                    let fieldValue = null;

                    if (paramName === "id" && bodyData.player_id) {
                        fieldValue = bodyData.player_id;
                        delete bodyData.player_id;
                    } else if (bodyData[paramName]) {
                        fieldValue = bodyData[paramName];
                        delete bodyData[paramName];
                    }

                    if (fieldValue) {
                        path = path.replace(param, fieldValue);
                    }
                });
            }
        }

        if (bodyData && Object.keys(bodyData).length > 0) {
            if (cmd.method === "GET") {
                // For GET requests, add as query parameters
                const queryParams = new URLSearchParams();
                Object.keys(bodyData).forEach((key) => {
                    if (
                        bodyData[key] !== "" &&
                        bodyData[key] !== null &&
                        bodyData[key] !== undefined
                    ) {
                        queryParams.append(key, bodyData[key]);
                    }
                });
                const queryString = queryParams.toString();
                if (queryString) {
                    path += (path.includes("?") ? "&" : "?") + queryString;
                }
            } else {
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(bodyData);
            }
        }

        const res = await fetch(path, options);
        const data = await res.json();

        if (res.ok) {
            showResponse(JSON.stringify(data, null, 2), false);
        } else {
            showResponse(
                "Error " + res.status + ":\n" + JSON.stringify(data, null, 2),
                true
            );
        }
    } catch (e) {
        showResponse("Request failed: " + e.message, true);
    }
}

function executeCommandWithForm(cmd, cmdId) {
    if (!connected) {
        showResponse("Error: Not connected to server", true);
        return;
    }

    const bodyData = {};
    let hasError = false;

    if (cmd.fields) {
        cmd.fields.forEach((field) => {
            const elem = document.getElementById(`${cmdId}-${field.name}`);
            if (elem) {
                if (field.type === "checkbox") {
                    bodyData[field.name] = elem.checked;
                } else if (field.type === "number") {
                    const val = parseInt(elem.value);
                    if (isNaN(val) && elem.value !== "") {
                        hasError = true;
                    }
                    bodyData[field.name] = val || 0;
                } else if (field.type === "select") {
                    // Convert to number if the value is numeric
                    const val = elem.value;
                    if (val && !isNaN(val)) {
                        bodyData[field.name] = parseInt(val);
                    } else {
                        bodyData[field.name] = val;
                    }
                } else {
                    bodyData[field.name] = elem.value;
                }
            }
        });
    }

    if (hasError) {
        showResponse("Error: Invalid number format", true);
        return;
    }

    executeCommand(cmd, bodyData);
}

async function checkStatus() {
    try {
        const res = await fetch("/api/v2/connection/status");
        const data = await res.json();
        updateUI(data.connected, data);
    } catch (e) {
        updateUI(false);
    }
}

async function connect() {
    const host = document.getElementById("host").value;
    const port = parseInt(document.getElementById("port").value);
    const password = document.getElementById("password").value;

    if (!host || !port || !password) {
        alert("Please fill in all fields");
        return;
    }

    showResponse("Connecting to " + host + ":" + port + "...", false);

    try {
        const res = await fetch("/api/v2/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ host, port, password }),
        });

        const data = await res.json();

        if (res.ok) {
            showResponse(
                "✅ Connected successfully!\n\n" + JSON.stringify(data, null, 2),
                false
            );
            updateUI(true, data);
        } else {
            showResponse(
                "❌ Connection failed:\n" + JSON.stringify(data, null, 2),
                true
            );
        }
    } catch (e) {
        showResponse("❌ Connection failed: " + e.message, true);
    }
}

async function disconnect() {
    try {
        const res = await fetch("/api/v2/disconnect", {
            method: "POST",
            credentials: "include",
        });

        if (res.ok) {
            updateUI(false);
            showResponse("Disconnected successfully", false);
        }
    } catch (e) {
        showResponse("Disconnect failed: " + e.message, true);
    }
}

function toggleHostVisibility() {
    hostVisible = !hostVisible;
    checkStatus();
}

function updateUI(isConnected, data = {}) {
    connected = isConnected;
    const commandsConnectionStatus = document.getElementById("commandsConnectionStatus");
    const connectionBar = document.querySelector(".connection-bar");

    if (isConnected) {
        const displayHost = hostVisible ? data.host : "•••.•••.•••.•••";
        commandsConnectionStatus.innerHTML = `
        <span class="connection-badge">
          Connected to <span class="masked" onclick="toggleHostVisibility()" title="Click to ${hostVisible ? "hide" : "show"
            }">${displayHost}</span>:${data.port || ""}
        </span>
        <button class="disconnect-button small" onclick="disconnect()">Disconnect</button>
    `;
        // Hide the entire connection bar when connected
        if (connectionBar) {
            connectionBar.style.display = 'none';
        }
        // Add connected class to body for CSS styling
        document.body.classList.add('connected');
        enableCommandButtons(true);
    } else {
        commandsConnectionStatus.innerHTML = '';
        // Show the connection bar when disconnected
        if (connectionBar) {
            connectionBar.style.display = 'block';
        }
        // Remove connected class from body
        document.body.classList.remove('connected');
        enableCommandButtons(false);
    }
}

function enableCommandButtons(enabled) {
    // Enable or disable all command execute buttons
    const commandButtons = document.querySelectorAll('.command-button');
    commandButtons.forEach(button => {
        button.disabled = !enabled;
    });
}

function showResponse(text, isError) {
    const resp = document.getElementById("response");

    if (isError) {
        resp.classList.add("error");
        resp.textContent = text;
    } else {
        resp.classList.remove("error");
        // Display raw RCON response with syntax highlighting
        const rawText =
            typeof text === "string" ? text : JSON.stringify(text, null, 2);

        // Try to parse and highlight as JSON
        try {
            const parsed = JSON.parse(rawText);
            const formatted = JSON.stringify(parsed, null, 2);
            const highlighted = hljs.highlight(formatted, {
                language: "json",
            }).value;
            resp.innerHTML = `<pre><code class="language-json">${highlighted}</code></pre>`;
        } catch (e) {
            // Not JSON, display as plain text
            resp.textContent = rawText;
        }
    }
}

async function copyResponse() {
    const resp = document.getElementById("response");
    const copyBtn = document.getElementById("copyBtn");

    try {
        // Get the text content (without HTML formatting)
        const text = resp.textContent;
        await navigator.clipboard.writeText(text);

        // Visual feedback
        copyBtn.textContent = "✓ Copied!";
        copyBtn.classList.add("copied");

        setTimeout(() => {
            copyBtn.textContent = "📋 Copy Response";
            copyBtn.classList.remove("copied");
        }, 2000);
    } catch (err) {
        console.error("Failed to copy:", err);
        copyBtn.textContent = "✗ Failed";
        setTimeout(() => {
            copyBtn.textContent = "📋 Copy Response";
        }, 2000);
    }
}

async function loadVersion() {
    try {
        const res = await fetch("/version");
        const data = await res.json();
        const versionEl = document.getElementById("appVersion");
        const githubLinkEl = document.getElementById("githubLink");

        if (versionEl) {
            let versionText = data.version || "dev";
            let githubUrl = "https://github.com/Sledro/hllrcon";

            // Determine the GitHub link based on version type
            if (data.version && data.version.startsWith("v") && data.version !== "dev") {
                // For tagged versions (v1.0.0), link to releases
                githubUrl = `https://github.com/Sledro/hllrcon/releases/tag/${data.version}`;
            } else if (data.git_commit && data.git_commit !== "unknown") {
                // For commits, link to the specific commit
                githubUrl = `https://github.com/Sledro/hllrcon/commit/${data.git_commit}`;
                versionText += ` (${data.git_commit.substring(0, 7)})`;
            }

            versionEl.textContent = `${versionText}`;
            versionEl.href = githubUrl;
            versionEl.title = `${data.version}\nCommit: ${data.git_commit}\nBuild Date: ${data.build_date}\nClick to view on GitHub`;

            // Update GitHub icon link to same URL
            if (githubLinkEl) {
                githubLinkEl.href = githubUrl;
            }
        }
    } catch (e) {
        const versionEl = document.getElementById("appVersion");
        if (versionEl) {
            versionEl.textContent = "dev";
            versionEl.href = "https://github.com/Sledro/hllrcon";
        }
    }
}

// Map functionality
let mapList = [];

async function loadMapList() {
    try {
        const res = await fetch("/api/v2/maps");
        const text = await res.text();
        mapList = text.trim().split("\n").filter((line) => line.trim() !== "");

        // Populate any pending map select dropdowns
        populatePendingMapSelects();

        return mapList;
    } catch (e) {
        console.error("Failed to load map list:", e);
        return [];
    }
}

function populatePendingMapSelects() {
    const pendingSelects = document.querySelectorAll(".map-select-pending");

    pendingSelects.forEach(select => {
        // Clear existing options except placeholder
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add all map options
        mapList.forEach(map => {
            const option = document.createElement("option");
            option.value = map;
            option.textContent = map;
            select.appendChild(option);
        });

        // Remove pending class
        select.classList.remove("map-select-pending");
    });
}

// Initialize on load
async function initialize() {
    await loadMapList();
    initializeCommands();

    // Show initial message in response window
    showResponse("Connect to your server to start executing commands", false);

    checkStatus();
    loadVersion();
}

initialize();

