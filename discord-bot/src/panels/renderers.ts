import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type MessageEditOptions
} from "discord.js";
import type { HllPlayer, OverviewSnapshot } from "../types.js";

function stringifyCompact(value: unknown): string {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "string") return value.slice(0, 1024);
  return (JSON.stringify(value) ?? "n/a").slice(0, 1024);
}

function firstNonEmptyRecordValue(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function panelBase(title: string, description: string, color: number) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setFooter({ text: `Updated ${new Date().toLocaleString()}` });
}

function lines(items: string[]): string {
  return items.join("\n");
}

function listHint(emptyText: string, actionText: string, rawValue: unknown): string {
  const compact = stringifyCompact(rawValue);
  if (compact === "[]" || compact === "{}" || compact === "n/a" || compact === "") {
    return emptyText;
  }
  return actionText;
}

function buildLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.changelist === "string") return record.changelist;
    if (typeof record.changelist === "number") return String(record.changelist);
  }
  return stringifyCompact(value);
}

export function createQuickActionsMessage(): MessageEditOptions {
  const embed = panelBase("Quick Actions", "Fast server-wide actions for live admin work.", 0xf1c40f)
    .addFields(
      {
        name: "Available Here",
        value: lines([
          "• `Broadcast Message`",
          "• `Change Map`",
          "• `Set Welcome Message`"
        ]),
        inline: false
      },
      {
        name: "Best Used For",
        value: "Round flow, join messaging, and urgent server announcements.",
        inline: false
      }
    );
  const menu = new StringSelectMenuBuilder().setCustomId("hll:v2:quick_actions:action").setPlaceholder("Choose a quick action").addOptions(
    { label: "Broadcast", value: "broadcast", description: "Send a server-wide message" },
    { label: "Change Map", value: "change_map", description: "Switch maps immediately" },
    { label: "Welcome Message", value: "welcome", description: "Update the join message" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:quick_actions:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), buttons] };
}

export function createPlayerActionsMessage(players: HllPlayer[]): MessageEditOptions {
  const embed = panelBase("Player Actions", "Search for a player by name, select them, then run the moderation action you need.", 0x5865f2)
    .addFields(
      { name: "Live Players", value: `${players.length}`, inline: true },
      { name: "Workflow", value: "`Find Player` → choose match → run action", inline: true },
      {
        name: "Available Here",
        value: lines([
          "• `Message`",
          "• `Kick`",
          "• `Punish`",
          "• `Switch Team`",
          "• `Remove from Squad`",
          "• `View Details`"
        ]),
        inline: false
      }
    );
  const actions = new StringSelectMenuBuilder().setCustomId("hll:v2:player_actions:action").setPlaceholder("Choose a player action").addOptions(
    { label: "💬 Message", value: "message_player", description: "Send a private message" },
    { label: "👢 Kick", value: "kick_player", description: "Remove a player" },
    { label: "⚠️ Punish", value: "punish_player", description: "Punish a player" },
    { label: "🔄 Switch Team", value: "force_switch_now", description: "Force team switch now" },
    { label: "👥 Remove from Squad", value: "remove_from_squad", description: "Remove player from squad" },
    { label: "👤 View Details", value: "player_card", description: "View player details" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:player_actions:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:player_actions:find").setLabel("Find Player").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:player_actions:list").setLabel("Player List").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:player_actions:disband").setLabel("Disband Squad").setStyle(ButtonStyle.Danger)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(actions), buttons] };
}

export function createBansMessage(tempBans: unknown, permaBans: unknown): MessageEditOptions {
  const embed = panelBase("Bans", "Ban, unban, and review punishment state.", 0xed4245)
    .addFields(
      { name: "Temp Bans", value: listHint("None listed", "`View Temporary Bans`", tempBans), inline: true },
      { name: "Perm Bans", value: listHint("None listed", "`View Permanent Bans`", permaBans), inline: true },
      {
        name: "Available Here",
        value: lines([
          "• `Temporary Ban`",
          "• `Permanent Ban`",
          "• `Remove Temporary Ban`",
          "• `Remove Permanent Ban`"
        ]),
        inline: false
      }
    );
  const menu = new StringSelectMenuBuilder().setCustomId("hll:v2:bans:action").setPlaceholder("Choose a bans action").addOptions(
    { label: "⏰ Temp Ban", value: "temp_ban_player", description: "Temporarily ban a selected player" },
    { label: "🚫 Perm Ban", value: "perma_ban_player", description: "Permanently ban a selected player" },
    { label: "✅ Remove Temp Ban", value: "remove_temp_ban", description: "Unban a temporary target" },
    { label: "✅ Remove Perm Ban", value: "remove_perma_ban", description: "Unban a permanent target" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:bans:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:bans:view_temp").setLabel("Temp List").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:bans:view_perma").setLabel("Perm List").setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), buttons] };
}

export function createVipManagementMessage(vips: unknown): MessageEditOptions {
  const summary = stringifyCompact(vips);
  const embed = panelBase("VIP Management", "Grant, revoke, and review VIP access.", 0x3ba55d)
    .addFields(
      { name: "VIP Status", value: summary === "[]" ? "No VIP players listed." : "`View VIP Players`", inline: true },
      { name: "Slots", value: "Use `Set VIP Slots` to adjust reserved access.", inline: true },
      {
        name: "Available Here",
        value: lines([
          "• `Add VIP`",
          "• `Remove VIP`",
          "• `Set VIP Slots`"
        ]),
        inline: false
      }
    );
  const menu = new StringSelectMenuBuilder().setCustomId("hll:v2:vip_management:action").setPlaceholder("Choose a VIP action").addOptions(
    { label: "⭐ Add VIP", value: "add_vip", description: "Grant VIP status" },
    { label: "❌ Remove VIP", value: "remove_vip", description: "Remove VIP status" },
    { label: "🎫 Set VIP Slots", value: "set_vip_slots", description: "Set VIP slots" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:vip_management:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:vip_management:view").setLabel("VIP List").setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), buttons] };
}

export function createAdminManagementMessage(admins: unknown, adminGroups: unknown): MessageEditOptions {
  const embed = panelBase("Admin Management", "Assign or remove admin access and inspect available groups.", 0x2ecc71)
    .addFields(
      { name: "Admins", value: listHint("None returned", "`View Admins`", admins), inline: true },
      { name: "Groups", value: listHint("None returned", "`View Admin Groups`", adminGroups), inline: true },
      {
        name: "Available Here",
        value: lines([
          "• `Add Admin`",
          "• `Remove Admin`"
        ]),
        inline: false
      }
    );
  const menu = new StringSelectMenuBuilder().setCustomId("hll:v2:admin_management:action").setPlaceholder("Choose an admin action").addOptions(
    { label: "👮 Add Admin", value: "add_admin", description: "Grant admin privileges" },
    { label: "❌ Remove Admin", value: "remove_admin", description: "Remove admin privileges" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:admin_management:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:admin_management:view_admins").setLabel("Admin List").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:admin_management:view_groups").setLabel("Group List").setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), buttons] };
}

export function createServerInfoMessage(snapshot: OverviewSnapshot): MessageEditOptions {
  const serverInfo = snapshot.serverInfo ?? {};
  const serverName = firstNonEmptyRecordValue(serverInfo, ["ServerName", "name", "Name"]) ?? "HLL Server";
  const currentMap = firstNonEmptyRecordValue(serverInfo, ["Map", "map", "CurrentMap"]) ?? "Unknown";
  const gameMode = firstNonEmptyRecordValue(serverInfo, ["GameMode", "game_mode", "Mode"]) ?? "Unknown";
  const sessionLabel = currentMap === "Unknown" && gameMode === "Unknown" ? "Use the buttons below to inspect the live session." : `${currentMap} • ${gameMode}`;
  const embed = panelBase("Server Info", "Read-only server context and operational visibility.", 0x3498db)
    .addFields(
      { name: "Server", value: serverName, inline: true },
      { name: "Status", value: snapshot.connection.connected ? "Connected" : "Disconnected", inline: true },
      { name: "Players", value: `${snapshot.players.length}`, inline: true },
      { name: "Current Session", value: sessionLabel, inline: false },
      { name: "Available Here", value: "`Player List` • `Player Details` • `Admin Logs`", inline: false }
    );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:server_info:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:server_info:view_players").setLabel("Player List").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:server_info:player_details").setLabel("Player Details").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:server_info:logs").setLabel("Admin Logs").setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [buttons] };
}

export function createMapManagementMessage(rotation: unknown, sequence: unknown): MessageEditOptions {
  const embed = panelBase("Map Management", "Control the current map, rotation, sequence, shuffle, and sector layout.", 0xe67e22)
    .addFields(
      { name: "Rotation", value: listHint("No entries", "`View Map Rotation`", rotation), inline: true },
      { name: "Sequence", value: listHint("No entries", "`View Map Sequence`", sequence), inline: true },
      {
        name: "Available Here",
        value: lines([
          "• `Add or Remove Rotation Map`",
          "• `Add or Remove Sequence Map`",
          "• `Move Map in Sequence`",
          "• `Enable or Disable Map Shuffle`",
          "• `Set Sector Layout`"
        ]),
        inline: false
      }
    );
  const menu = new StringSelectMenuBuilder().setCustomId("hll:v2:map_management:action").setPlaceholder("Choose a map management action").addOptions(
    { label: "➕ Add Map to Rotation", value: "add_map_rotation", description: "Add a map to rotation" },
    { label: "➖ Remove Map from Rotation", value: "remove_map_rotation", description: "Remove a map from rotation" },
    { label: "➕ Add Map to Sequence", value: "add_map_sequence", description: "Add a map to sequence" },
    { label: "➖ Remove Map from Sequence", value: "remove_map_sequence", description: "Remove a map from sequence" },
    { label: "↕️ Move Map in Sequence", value: "move_map_sequence", description: "Reorder the map sequence" },
    { label: "🔀 Enable/Disable Map Shuffle", value: "toggle_map_shuffle", description: "Change map shuffle state" },
    { label: "🎯 Set Sector Layout", value: "set_sector_layout", description: "Set sector layout" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:map_management:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:map_management:view_rotation").setLabel("Rotation").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:map_management:view_sequence").setLabel("Sequence").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:map_management:change").setLabel("Change Map").setStyle(ButtonStyle.Danger)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), buttons] };
}

export function createServerSettingsMessage(profanities: unknown): MessageEditOptions {
  const embed = panelBase("Server Settings", "Core server rules, limits, balancing, vote kick, and timers.", 0x9b59b6)
    .addFields(
      { name: "Word List", value: listHint("None returned", "`View Banned Words`", profanities), inline: true },
      { name: "Scope", value: "Queue • balance • vote kick • timers • profanity", inline: true },
      {
        name: "Available Here",
        value: lines([
          "• `Team Switch Cooldown`",
          "• `Max Queue Size`",
          "• `Idle Kick Timer`",
          "• `High Ping Threshold`",
          "• `Auto Balance` and `Threshold`",
          "• `Vote Kick` and `Threshold`",
          "• `Match Timer` and `Warmup Timer`",
          "• `Banned Words`"
        ]),
        inline: false
      }
    );
  const menu = new StringSelectMenuBuilder().setCustomId("hll:v2:server_settings:action").setPlaceholder("Choose a settings action").addOptions(
    { label: "⏱️ Team Switch Cooldown", value: "team_switch_cooldown", description: "Set team switch cooldown" },
    { label: "🚪 Max Queue Size", value: "max_queue", description: "Set max queue size" },
    { label: "💤 Idle Kick Timer", value: "idle_kick", description: "Set idle kick timer" },
    { label: "📶 High Ping Threshold", value: "high_ping", description: "Set high ping threshold" },
    { label: "⚖️ Auto Balance", value: "auto_balance_toggle", description: "Enable or disable auto balance" },
    { label: "⚖️ Auto Balance Threshold", value: "auto_balance_threshold", description: "Set auto balance threshold" },
    { label: "🗳️ Vote Kick", value: "vote_kick_toggle", description: "Enable or disable vote kick" },
    { label: "🗳️ Vote Kick Threshold", value: "vote_kick_threshold", description: "Set vote kick threshold" },
    { label: "🚫 Add Banned Words", value: "add_banned_words", description: "Add banned words" },
    { label: "✅ Remove Banned Words", value: "remove_banned_words", description: "Remove banned words" },
    { label: "⏰ Set Match Timer", value: "set_match_timer", description: "Set match timer" },
    { label: "❌ Remove Match Timer", value: "remove_match_timer", description: "Remove match timer" },
    { label: "🔥 Set Warmup Timer", value: "set_warmup_timer", description: "Set warmup timer" },
    { label: "❌ Remove Warmup Timer", value: "remove_warmup_timer", description: "Remove warmup timer" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:server_settings:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:server_settings:view_words").setLabel("Word List").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("hll:v2:server_settings:reset_vote_kick").setLabel("Reset Threshold").setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), buttons] };
}

export function createAdvancedMessage(changelist: unknown): MessageEditOptions {
  const embed = panelBase("Advanced", "Protocol reference tools and lower-frequency server options.", 0x95a5a6)
    .addFields(
      { name: "Server Build", value: buildLabel(changelist), inline: true },
      { name: "Scope", value: "Weather • references • build info", inline: true },
      {
        name: "Available Here",
        value: "`Dynamic Weather` • `Commands List` • `Command Reference` • `Server Build`",
        inline: false
      }
    );
  const menu = new StringSelectMenuBuilder().setCustomId("hll:v2:advanced:action").setPlaceholder("Choose an advanced action").addOptions(
    { label: "🌦️ Dynamic Weather", value: "dynamic_weather", description: "Enable or disable dynamic weather" },
    { label: "📋 Commands List", value: "commands_list", description: "Retrieve all available RCON commands" },
    { label: "📖 Command Reference", value: "command_reference", description: "Get details for one command" }
  );
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("hll:v2:advanced:refresh").setLabel("Refresh").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("hll:v2:advanced:build").setLabel("Get Server Build").setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), buttons] };
}

// Compatibility exports retained while the bot transitions from the older MVP panel names.
export const createOverviewMessage = createServerInfoMessage;
export const createPlayersMessage = createPlayerActionsMessage;
export const createMapsMessage = createMapManagementMessage;
export const createAccessMessage = createAdminManagementMessage;
export const createSettingsMessage = createServerSettingsMessage;

export function createPlayerCard(playerId: string, detail: Record<string, unknown>) {
  const json = JSON.stringify(detail, null, 2);
  return new EmbedBuilder()
    .setTitle(`Player Card: ${playerId}`)
    .setDescription(json.length > 3900 ? `${json.slice(0, 3900)}...` : json || "No detail returned")
    .setColor(0x5865f2);
}

export function createAuditEmbed(actorTag: string, action: string, target: string, result: string) {
  return new EmbedBuilder()
    .setTitle("HLL Audit Event")
    .setColor(0xeb459e)
    .addFields(
      { name: "Actor", value: actorTag, inline: true },
      { name: "Action", value: action, inline: true },
      { name: "Target", value: target, inline: true },
      { name: "Result", value: result, inline: false }
    )
    .setTimestamp(new Date());
}
