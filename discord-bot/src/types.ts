export type PanelKey =
  | "overview"
  | "players"
  | "maps"
  | "access"
  | "settings"
  | "quick_actions"
  | "player_actions"
  | "bans"
  | "vip_management"
  | "admin_management"
  | "server_info"
  | "map_management"
  | "server_settings"
  | "advanced";

export interface StoredPanelMessage {
  panelKey: PanelKey;
  channelId: string;
  messageId: string;
  updatedAt: string;
}

export interface RecentPlayerSelection {
  playerId: string;
  label: string;
  selectedAt: string;
}

export interface PendingAction {
  id: string;
  kind:
    | "kick"
    | "punish"
    | "temp_ban"
    | "perma_ban"
    | "remove_from_squad"
    | "force_switch_death"
    | "force_switch_now"
    | "change_map"
    | "remove_vip"
    | "remove_admin"
    | "remove_temp_ban"
    | "remove_perma_ban"
    | "reset_vote_kick"
    | "auto_balance_disable"
    | "vote_kick_disable"
    | "remove_banned_words";
  actorUserId: string;
  targetLabel: string;
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export interface GuildState {
  panels: Partial<Record<PanelKey, StoredPanelMessage>>;
  auditChannelId?: string;
  recentSelections: Record<string, RecentPlayerSelection>;
}

export interface AppState {
  guilds: Record<string, GuildState>;
}

export interface HllPlayer {
  id: string;
  name: string;
  team?: string;
  squad?: string;
  role?: string;
  level?: string | number;
  score?: string | number;
  raw: Record<string, unknown>;
}

export interface OverviewSnapshot {
  connection: {
    connected: boolean;
    host?: string;
    port?: number;
  };
  serverInfo: Record<string, unknown> | null;
  players: HllPlayer[];
  mapRotation: unknown;
  mapSequence: unknown;
  changelist: unknown;
}
