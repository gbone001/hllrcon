import { config } from "../config.js";
import type { HllPlayer, OverviewSnapshot } from "../types.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

function toBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return undefined;
}

function normalizePlayer(entry: unknown): HllPlayer | null {
  const record = asRecord(entry);
  if (!record) {
    return null;
  }

  const id = pickString(record, ["player_id", "PlayerId", "steam_id", "SteamId", "id", "ID"]);
  const name = pickString(record, ["name", "Name", "player_name", "PlayerName"]);
  if (!id && !name) {
    return null;
  }

  return {
    id: id ?? name ?? "unknown",
    name: name ?? id ?? "Unknown Player",
    team: pickString(record, ["team", "Team", "team_name", "TeamName"]),
    squad: pickString(record, ["squad", "Squad", "unit", "Unit", "platoon", "Platoon"]),
    role: pickString(record, ["role", "Role", "loadout", "Loadout"]),
    level: pickString(record, ["level", "Level"]),
    score: pickString(record, ["score", "Score"]),
    raw: record
  };
}

function normalizePlayers(payload: unknown): HllPlayer[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizePlayer).filter((value): value is HllPlayer => Boolean(value));
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  for (const key of ["players", "Players", "data", "Data"]) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      return nested.map(normalizePlayer).filter((value): value is HllPlayer => Boolean(value));
    }
  }

  return [];
}

export class HllRconClient {
  private sessionCookie = "";

  private get defaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json"
    };

    if (config.hllrconAppPassword) {
      headers.Authorization = toBasicAuthHeader(config.hllrconAppUsername, config.hllrconAppPassword);
    }

    if (this.sessionCookie) {
      headers.Cookie = this.sessionCookie;
    }

    return headers;
  }

  private async request<T>(method: HttpMethod, route: string, body?: unknown, parseAsText = false): Promise<T> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body !== undefined && method !== "GET") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${config.hllrconBaseUrl}${route}`, options);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.sessionCookie = setCookie.split(";")[0];
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${method} ${route} failed (${response.status}): ${errorText}`);
    }

    if (parseAsText) {
      return (await response.text()) as T;
    }

    return (await response.json()) as T;
  }

  async connect(): Promise<void> {
    await this.request("POST", "/api/v2/connect", {
      host: config.hllServerHost,
      port: config.hllServerPort,
      password: config.hllServerPassword
    });
  }

  async ensureConnected(): Promise<void> {
    try {
      const status = await this.request<{ connected?: boolean }>("GET", "/api/v2/connection/status");
      if (!status.connected) {
        await this.connect();
      }
    } catch {
      await this.connect();
    }
  }

  async getConnectionStatus(): Promise<Record<string, unknown>> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/connection/status");
  }

  async getServerInfo(): Promise<Record<string, unknown>> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/server");
  }

  async getPlayers(): Promise<HllPlayer[]> {
    await this.ensureConnected();
    const payload = await this.request<unknown>("GET", "/api/v2/players");
    return normalizePlayers(payload);
  }

  async getPlayer(playerId: string): Promise<Record<string, unknown>> {
    await this.ensureConnected();
    return this.request("GET", `/api/v2/players/${encodeURIComponent(playerId)}`);
  }

  async getMapRotation(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/map-rotation");
  }

  async getMapSequence(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/map-sequence");
  }

  async getCommandsList(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/commands");
  }

  async getCommandReference(command: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", `/api/v2/command-reference?command=${encodeURIComponent(command)}`);
  }

  async getServerBuild(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/changelist");
  }

  async getVIPs(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/vips");
  }

  async addVIP(playerId: string, comment: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/vips", { player_id: playerId, comment });
  }

  async removeVIP(playerId: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/vips", { player_id: playerId });
  }

  async setVipSlots(count: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/vip-slots", { vip_slot_count: count });
  }

  async getAdmins(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/admins");
  }

  async getAdminGroups(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/admin-groups");
  }

  async addAdmin(playerId: string, adminGroup: string, comment: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/admins", {
      player_id: playerId,
      admin_group: adminGroup,
      comment
    });
  }

  async removeAdmin(playerId: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/admins", { player_id: playerId });
  }

  async getTempBans(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/bans?type=temp");
  }

  async getPermaBans(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/bans?type=perma");
  }

  async removeTempBan(playerId: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/temp-ban", { player_id: playerId });
  }

  async removePermaBan(playerId: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/perma-ban", { player_id: playerId });
  }

  async getProfanities(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", "/api/v2/profanities");
  }

  async broadcast(message: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/broadcast", { message });
  }

  async setWelcomeMessage(message: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/welcome-message", { message });
  }

  async setTeamSwitchCooldown(value: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/team-switch-cooldown", { team_switch_timer: value });
  }

  async setMaxQueuedPlayers(value: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/max-queued-players", { max_queued_players: value });
  }

  async setIdleKickDuration(value: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/idle-kick-duration", { idle_timeout_minutes: value });
  }

  async setHighPingThreshold(value: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/high-ping-threshold", { high_ping_threshold_ms: value });
  }

  async setAutoBalanceEnabled(enable: boolean): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/auto-balance/enabled", { enable });
  }

  async setAutoBalanceThreshold(value: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/auto-balance/threshold", { auto_balance_threshold: value });
  }

  async setVoteKickEnabled(enable: boolean): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/vote-kick/enabled", { enable });
  }

  async setVoteKickThreshold(value: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/vote-kick/threshold", { threshold_value: value });
  }

  async resetVoteKickThreshold(): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/vote-kick/reset", {});
  }

  async addBannedWords(words: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/profanities", { banned_words: words });
  }

  async removeBannedWords(words: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/profanities", { banned_words: words });
  }

  async getAdminLogs(seconds = 3600): Promise<unknown> {
    await this.ensureConnected();
    return this.request("GET", `/api/v2/logs?seconds=${seconds}`);
  }

  async getMapList(): Promise<string[]> {
    await this.ensureConnected();
    const text = await this.request<string>("GET", "/api/v2/maps", undefined, true);
    return text.split("\n").map((entry) => entry.trim()).filter(Boolean);
  }

  async getOverviewSnapshot(): Promise<OverviewSnapshot> {
    const [connection, serverInfo, players, mapRotation, mapSequence, changelist] = await Promise.all([
      this.getConnectionStatus(),
      this.getServerInfo(),
      this.getPlayers(),
      this.getMapRotation(),
      this.getMapSequence(),
      this.request<unknown>("GET", "/api/v2/changelist")
    ]);

    return {
      connection: {
        connected: Boolean(connection.connected),
        host: typeof connection.host === "string" ? connection.host : undefined,
        port: typeof connection.port === "number" ? connection.port : undefined
      },
      serverInfo,
      players,
      mapRotation,
      mapSequence,
      changelist
    };
  }

  async messagePlayer(playerId: string, message: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", `/api/v2/players/${encodeURIComponent(playerId)}/message`, { message });
  }

  async kickPlayer(playerId: string, reason: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/kick", { player_id: playerId, reason });
  }

  async punishPlayer(playerId: string, reason: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/punish", { player_id: playerId, reason });
  }

  async tempBanPlayer(playerId: string, duration: number, reason: string, adminName: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/temp-ban", {
      player_id: playerId,
      duration,
      reason,
      admin_name: adminName
    });
  }

  async permaBanPlayer(playerId: string, reason: string, adminName: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/perma-ban", {
      player_id: playerId,
      reason,
      admin_name: adminName
    });
  }

  async forceTeamSwitch(playerId: string, forceMode: 0 | 1): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/force-team-switch", {
      player_id: playerId,
      force_mode: forceMode
    });
  }

  async removeFromSquad(playerId: string, reason: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/remove-from-squad", {
      player_id: playerId,
      reason
    });
  }

  async disbandSquad(teamIndex: number, squadIndex: number, reason: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/disband-squad", {
      team_index: teamIndex,
      squad_index: squadIndex,
      reason
    });
  }

  async changeMap(mapName: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/change-map", { map_name: mapName });
  }

  async addMapToRotation(mapName: string, index: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/map-rotation", { map_name: mapName, index });
  }

  async removeMapFromRotation(index: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/map-rotation", { index });
  }

  async addMapToSequence(mapName: string, index: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/map-sequence", { map_name: mapName, index });
  }

  async removeMapFromSequence(index: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/map-sequence", { index });
  }

  async moveMapInSequence(currentIndex: number, newIndex: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("PUT", "/api/v2/map-sequence/move", {
      current_index: currentIndex,
      new_index: newIndex
    });
  }

  async setMapShuffleEnabled(enable: boolean): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/map-shuffle", { enable });
  }

  async setSectorLayout(sectors: [string, string, string, string, string]): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/sector-layout", {
      sector_1: sectors[0],
      sector_2: sectors[1],
      sector_3: sectors[2],
      sector_4: sectors[3],
      sector_5: sectors[4]
    });
  }

  async setMatchTimer(gameMode: string, matchLength: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/match-timer", {
      game_mode: gameMode,
      match_length: matchLength
    });
  }

  async removeMatchTimer(gameMode: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/match-timer", { game_mode: gameMode });
  }

  async setWarmupTimer(gameMode: string, warmupLength: number): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/warmup-timer", {
      game_mode: gameMode,
      warmup_length: warmupLength
    });
  }

  async removeWarmupTimer(gameMode: string): Promise<unknown> {
    await this.ensureConnected();
    return this.request("DELETE", "/api/v2/warmup-timer", { game_mode: gameMode });
  }

  async setDynamicWeather(mapId: string, enable: boolean): Promise<unknown> {
    await this.ensureConnected();
    return this.request("POST", "/api/v2/dynamic-weather", { map_id: mapId, enable });
  }
}
