import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AppState,
  GuildState,
  PanelKey,
  PendingAction,
  RecentPlayerSelection,
  StoredPanelMessage
} from "../types.js";

export class FileStore {
  private state: AppState = { guilds: {} };
  private readonly pendingActions = new Map<string, PendingAction>();

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, "utf8");
      this.state = JSON.parse(raw) as AppState;
    } catch {
      this.state = { guilds: {} };
      await this.save();
    }
  }

  async save(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
  }

  getGuildState(guildId: string): GuildState {
    if (!this.state.guilds[guildId]) {
      this.state.guilds[guildId] = {
        panels: {},
        recentSelections: {}
      };
    }
    return this.state.guilds[guildId];
  }

  async setPanel(guildId: string, panel: StoredPanelMessage): Promise<void> {
    const guild = this.getGuildState(guildId);
    guild.panels[panel.panelKey] = panel;
    await this.save();
  }

  getPanel(guildId: string, panelKey: PanelKey): StoredPanelMessage | undefined {
    return this.getGuildState(guildId).panels[panelKey];
  }

  async setAuditChannelId(guildId: string, channelId: string): Promise<void> {
    const guild = this.getGuildState(guildId);
    guild.auditChannelId = channelId;
    await this.save();
  }

  getAuditChannelId(guildId: string): string | undefined {
    return this.getGuildState(guildId).auditChannelId;
  }

  async setRecentSelection(guildId: string, userId: string, selection: RecentPlayerSelection): Promise<void> {
    const guild = this.getGuildState(guildId);
    guild.recentSelections[userId] = selection;
    await this.save();
  }

  getRecentSelection(guildId: string, userId: string): RecentPlayerSelection | undefined {
    return this.getGuildState(guildId).recentSelections[userId];
  }

  createPendingAction(action: Omit<PendingAction, "id" | "createdAt" | "expiresAt">): PendingAction {
    const now = new Date();
    const pending: PendingAction = {
      ...action,
      id: randomUUID(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString()
    };

    this.pendingActions.set(pending.id, pending);
    return pending;
  }

  getPendingAction(id: string): PendingAction | undefined {
    const action = this.pendingActions.get(id);
    if (!action) {
      return undefined;
    }

    if (Date.parse(action.expiresAt) < Date.now()) {
      this.pendingActions.delete(id);
      return undefined;
    }

    return action;
  }

  deletePendingAction(id: string): void {
    this.pendingActions.delete(id);
  }
}
