import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CategoryChannel,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Guild,
  GuildMember,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildBasedChannel,
  type ModalSubmitInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type StringSelectMenuInteraction
} from "discord.js";
import { HllRconClient } from "./api/hllrcon-client.js";
import { config } from "./config.js";
import {
  createAdminManagementMessage,
  createAuditEmbed,
  createAdvancedMessage,
  createBansMessage,
  createMapManagementMessage,
  createPlayerCard,
  createPlayerActionsMessage,
  createQuickActionsMessage,
  createServerInfoMessage,
  createServerSettingsMessage,
  createVipManagementMessage
} from "./panels/renderers.js";
import { FileStore } from "./store/file-store.js";
import type { PanelKey, PendingAction } from "./types.js";

const PANEL_CHANNELS: Record<PanelKey | "audit", string> = {
  overview: "hll-server-info-legacy",
  players: "hll-player-actions-legacy",
  maps: "hll-map-management-legacy",
  access: "hll-admin-management-legacy",
  bans: "hll-bans",
  settings: "hll-server-settings-legacy",
  quick_actions: "hll-quick-actions",
  player_actions: "hll-player-actions",
  vip_management: "hll-vip-management",
  admin_management: "hll-admin-management",
  server_info: "hll-server-info",
  map_management: "hll-map-management",
  server_settings: "hll-server-settings",
  advanced: "hll-advanced",
  audit: "hll-audit"
};

const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  new SlashCommandBuilder()
    .setName("hll-panels")
    .setDescription("Manage persistent HLL admin panels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) => subcommand.setName("setup").setDescription("Create or refresh the MVP panel channels and messages"))
    .addSubcommand((subcommand) => subcommand.setName("rebuild").setDescription("Recreate missing panel messages"))
    .addSubcommand((subcommand) => subcommand.setName("refresh-all").setDescription("Refresh all existing MVP panels"))
    .toJSON()
];

type AccessLevel = "observer" | "moderator" | "senior_admin" | "admin";

function modalField(id: string, label: string, style: TextInputStyle, required = true, value?: string) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);

  if (value) {
    input.setValue(value);
  }

  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

function paginateArray<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages
  };
}

export class HllDiscordBot {
  readonly client = new Client({ intents: [GatewayIntentBits.Guilds] });

  constructor(
    private readonly api: HllRconClient,
    private readonly store: FileStore
  ) {}

  private roleNamesFor(level: AccessLevel): string[] {
    switch (level) {
      case "observer":
        return [config.roleObserver, config.roleModerator, config.roleSeniorAdmin, config.roleAdmin];
      case "moderator":
        return [config.roleModerator, config.roleSeniorAdmin, config.roleAdmin];
      case "senior_admin":
        return [config.roleSeniorAdmin, config.roleAdmin];
      case "admin":
        return [config.roleAdmin];
    }
  }

  private memberHasLevel(member: GuildMember, level: AccessLevel): boolean {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    const allowedRoles = new Set(this.roleNamesFor(level));
    return member.roles.cache.some((role) => allowedRoles.has(role.name));
  }

  private async requireLevel(
    interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    level: AccessLevel
  ): Promise<boolean> {
    if (!interaction.inCachedGuild()) {
      return false;
    }

    if (this.memberHasLevel(interaction.member, level)) {
      return true;
    }

    const required = this.roleNamesFor(level).join(", ");
    const content = `You need one of these roles for that action: ${required}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
    return false;
  }

  private async requireByAction(
    interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    action: string
  ): Promise<boolean> {
    const seniorAdminActions = new Set([
      "setup",
      "rebuild",
      "refresh-all",
      "change_map",
      "add_vip",
      "remove_vip",
      "set_vip_slots",
      "add_admin",
      "remove_admin",
      "remove_temp_ban",
      "remove_perma_ban",
      "reset_vote_kick",
      "broadcast",
      "welcome",
      "add_map_rotation",
      "remove_map_rotation",
      "add_map_sequence",
      "remove_map_sequence",
      "move_map_sequence",
      "toggle_map_shuffle",
      "set_sector_layout",
      "dynamic_weather",
      "commands_list",
      "command_reference",
      "team_switch_cooldown",
      "max_queue",
      "idle_kick",
      "high_ping",
      "auto_balance_toggle",
      "auto_balance_enable",
      "auto_balance_disable",
      "auto_balance_threshold",
      "vote_kick_toggle",
      "vote_kick_enable",
      "vote_kick_disable",
      "vote_kick_threshold",
      "add_banned_words",
      "remove_banned_words",
      "set_vip_slots",
      "set_match_timer",
      "remove_match_timer",
      "set_warmup_timer",
      "remove_warmup_timer",
      "disband_squad"
    ]);

    const moderatorActions = new Set([
      "message_player",
      "kick_player",
      "punish_player",
      "temp_ban_player",
      "perma_ban_player",
      "remove_from_squad",
      "force_switch_death",
      "force_switch_now",
      "kick",
      "punish",
      "temp_ban",
      "perma_ban"
    ]);

    if (seniorAdminActions.has(action)) {
      return this.requireLevel(interaction, "senior_admin");
    }

    if (moderatorActions.has(action)) {
      return this.requireLevel(interaction, action === "perma_ban_player" || action === "perma_ban" ? "senior_admin" : "moderator");
    }

    return this.requireLevel(interaction, "observer");
  }

  async start(): Promise<void> {
    this.registerEventHandlers();
    await this.client.login(config.discordToken);
  }

  stop(): void {
    this.client.destroy();
  }

  private registerEventHandlers(): void {
    this.client.once(Events.ClientReady, async (readyClient) => {
      const guild = await this.resolveStartupGuild();
      if (guild) {
        await guild.commands.set(commandData);
        await this.tryStartupRefresh(guild);
      } else {
        console.warn("Bot connected, but no manageable guild was available. Invite the bot to a server and rerun /hll-panels setup.");
      }
      console.log(`Discord bot ready as ${readyClient.user.tag}`);
    });

    this.client.on(Events.Error, (error) => {
      console.error("Discord client error:", error);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleChatCommand(interaction);
          return;
        }

        if (interaction.isButton()) {
          await this.handleButton(interaction);
          return;
        }

        if (interaction.isStringSelectMenu()) {
          await this.handleSelect(interaction);
          return;
        }

        if (interaction.isModalSubmit()) {
          await this.handleModal(interaction);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (interaction.isRepliable()) {
          if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: `Action failed: ${message}`, ephemeral: true });
          } else {
            await interaction.reply({ content: `Action failed: ${message}`, ephemeral: true });
          }
        }
      }
    });
  }

  private async handleChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "This command must be used in the configured guild.", ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (!(await this.requireByAction(interaction, subcommand))) {
      return;
    }

    if (subcommand === "setup") {
      await this.setupGuild(interaction.guild);
      await interaction.editReply("Panels created or refreshed.");
      return;
    }

    if (subcommand === "rebuild") {
      await this.setupGuild(interaction.guild, true);
      await interaction.editReply("Panel rebuild complete.");
      return;
    }

    if (subcommand === "refresh-all") {
      await this.refreshAllPanels(interaction.guild);
      await interaction.editReply("All tracked MVP panels were refreshed.");
    }
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Guild context is required.", ephemeral: true });
      return;
    }

    const id = interaction.customId;
    if (id === "hll:v2:quick_actions:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "quick_actions");
      return;
    }
    if (id === "hll:v2:player_actions:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "player_actions");
      return;
    }
    if (id === "hll:v2:player_actions:list") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showPlayersPage(interaction, 0);
      return;
    }
    if (id === "hll:v2:player_actions:find") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showFindPlayerModal(interaction);
      return;
    }
    if (id === "hll:v2:player_search:find_again") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showFindPlayerModal(interaction);
      return;
    }
    if (id === "hll:v2:player_actions:disband") {
      if (!(await this.requireLevel(interaction, "moderator"))) return;
      const modal = new ModalBuilder()
        .setCustomId("hllmodal:v2:player_actions:disband")
        .setTitle("Disband Squad")
        .addComponents(
          modalField("team_index", "Team Index", TextInputStyle.Short),
          modalField("squad_index", "Squad Index", TextInputStyle.Short),
          modalField("reason", "Reason", TextInputStyle.Paragraph, false)
        );
      await interaction.showModal(modal);
      return;
    }
    if (id === "hll:v2:server_info:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "server_info");
      return;
    }
    if (id === "hll:v2:server_info:view_players") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showPlayersPage(interaction, 0);
      return;
    }
    if (id === "hll:v2:server_info:player_details") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: "Use the Player Actions panel to select a player and open details.", ephemeral: true });
      return;
    }
    if (id === "hll:v2:server_info:logs") {
      if (!(await this.requireLevel(interaction, "moderator"))) return;
      const logs = await this.api.getAdminLogs();
      await interaction.reply({ content: this.codeBlock(logs), ephemeral: true });
      return;
    }
    if (id === "hll:v2:map_management:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "map_management");
      return;
    }
    if (id === "hll:v2:map_management:view_rotation") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: this.codeBlock(await this.api.getMapRotation()), ephemeral: true });
      return;
    }
    if (id === "hll:v2:map_management:view_sequence") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: this.codeBlock(await this.api.getMapSequence()), ephemeral: true });
      return;
    }
    if (id === "hll:v2:map_management:change") {
      if (!(await this.requireByAction(interaction, "change_map"))) return;
      const modal = new ModalBuilder().setCustomId("hllmodal:v1:change_map").setTitle("Change Current Map").addComponents(modalField("map_name", "Map Name", TextInputStyle.Short));
      await interaction.showModal(modal);
      return;
    }
    if (id === "hll:v2:vip_management:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "vip_management");
      return;
    }
    if (id === "hll:v2:vip_management:view") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: this.codeBlock(await this.api.getVIPs()), ephemeral: true });
      return;
    }
    if (id === "hll:v2:admin_management:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "admin_management");
      return;
    }
    if (id === "hll:v2:admin_management:view_admins") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: this.codeBlock(await this.api.getAdmins()), ephemeral: true });
      return;
    }
    if (id === "hll:v2:admin_management:view_groups") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: this.codeBlock(await this.api.getAdminGroups()), ephemeral: true });
      return;
    }
    if (id === "hll:v2:bans:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "bans");
      return;
    }
    if (id === "hll:v2:bans:view_temp") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "temp", 0);
      return;
    }
    if (id === "hll:v2:bans:view_perma") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "perma", 0);
      return;
    }
    if (id === "hll:v2:server_settings:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "server_settings");
      return;
    }
    if (id === "hll:v2:server_settings:view_words") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: this.codeBlock(await this.api.getProfanities()), ephemeral: true });
      return;
    }
    if (id === "hll:v2:server_settings:reset_vote_kick") {
      if (!(await this.requireByAction(interaction, "reset_vote_kick"))) return;
      const pending = this.store.createPendingAction({ actorUserId: interaction.user.id, kind: "reset_vote_kick", targetLabel: "server vote kick threshold", payload: {} });
      await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setTitle("Confirm Reset").setDescription("Reset the vote kick threshold to default values?")], components: [this.confirmationRow(pending.id)] });
      return;
    }
    if (id === "hll:v2:advanced:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "advanced");
      return;
    }
    if (id === "hll:v2:advanced:build") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.reply({ content: this.codeBlock(await this.api.getServerBuild()), ephemeral: true });
      return;
    }
    if (id.startsWith("hll:v2:player_actions:page:")) {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showPlayersPage(interaction, Number(id.split(":").at(-1) ?? "0"), true);
      return;
    }
    if (id.startsWith("hll:v2:bans:page:temp:")) {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "temp", Number(id.split(":").at(-1) ?? "0"), true);
      return;
    }
    if (id.startsWith("hll:v2:bans:page:perma:")) {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "perma", Number(id.split(":").at(-1) ?? "0"), true);
      return;
    }
    if (id === "hll:v1:overview:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "overview");
      return;
    }

    if (id === "hll:v1:players:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "players");
      return;
    }

    if (id === "hll:v1:maps:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "maps");
      return;
    }

    if (id === "hll:v1:access:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "access");
      return;
    }

    if (id === "hll:v1:bans:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "bans");
      return;
    }

    if (id === "hll:v1:settings:refresh") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await interaction.deferUpdate();
      await this.refreshPanel(interaction.guild, "settings");
      return;
    }

    if (id === "hll:v1:overview:rotation" || id === "hll:v1:maps:view_rotation") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      const rotation = await this.api.getMapRotation();
      await interaction.reply({ content: this.codeBlock(rotation), ephemeral: true });
      return;
    }

    if (id === "hll:v1:overview:sequence" || id === "hll:v1:maps:view_sequence") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      const sequence = await this.api.getMapSequence();
      await interaction.reply({ content: this.codeBlock(sequence), ephemeral: true });
      return;
    }

    if (id === "hll:v1:overview:logs") {
      if (!(await this.requireLevel(interaction, "moderator"))) return;
      const logs = await this.api.getAdminLogs();
      await interaction.reply({ content: this.codeBlock(logs), ephemeral: true });
      return;
    }

    if (id === "hll:v1:access:view_vips") {
      await interaction.reply({ content: this.codeBlock(await this.api.getVIPs()), ephemeral: true });
      return;
    }

    if (id === "hll:v1:access:view_admins") {
      await interaction.reply({ content: this.codeBlock(await this.api.getAdmins()), ephemeral: true });
      return;
    }

    if (id === "hll:v1:access:view_groups") {
      await interaction.reply({ content: this.codeBlock(await this.api.getAdminGroups()), ephemeral: true });
      return;
    }

    if (id === "hll:v1:bans:view_temp") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "temp", 0);
      return;
    }

    if (id === "hll:v1:bans:view_perma") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "perma", 0);
      return;
    }

    if (id === "hll:v1:settings:view_profanities") {
      await interaction.reply({ content: this.codeBlock(await this.api.getProfanities()), ephemeral: true });
      return;
    }

    if (id === "hll:v1:settings:reset_vote_kick") {
      if (!(await this.requireByAction(interaction, "reset_vote_kick"))) return;
      const pending = this.store.createPendingAction({
        actorUserId: interaction.user.id,
        kind: "reset_vote_kick",
        targetLabel: "server vote kick threshold",
        payload: {}
      });
      await interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setTitle("Confirm Reset").setDescription("Reset the vote kick threshold to the default value?")],
        components: [this.confirmationRow(pending.id)]
      });
      return;
    }

    if (id === "hll:v1:players:list") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showPlayersPage(interaction, 0);
      return;
    }

    if (id.startsWith("hll:v1:players:page:")) {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showPlayersPage(interaction, Number(id.split(":").at(-1) ?? "0"), true);
      return;
    }

    if (id.startsWith("hll:v1:bans:page:temp:")) {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "temp", Number(id.split(":").at(-1) ?? "0"), true);
      return;
    }

    if (id.startsWith("hll:v1:bans:page:perma:")) {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.showBansPage(interaction, "perma", Number(id.split(":").at(-1) ?? "0"), true);
      return;
    }

    if (id === "hll:v1:maps:change") {
      if (!(await this.requireByAction(interaction, "change_map"))) return;
      const modal = new ModalBuilder()
        .setCustomId("hllmodal:v1:change_map")
        .setTitle("Change Current Map")
        .addComponents(modalField("map_name", "Map Name", TextInputStyle.Short));
      await interaction.showModal(modal);
      return;
    }

    if (id.startsWith("hll:v1:confirm:")) {
      await this.executePendingAction(interaction);
      return;
    }

    if (id.startsWith("hll:v1:cancel:")) {
      const pendingId = id.split(":").at(-1);
      if (pendingId) {
        this.store.deletePendingAction(pendingId);
      }
      await interaction.update({ content: "Action cancelled.", embeds: [], components: [] });
      return;
    }

    await interaction.reply({ content: "Unknown button action.", ephemeral: true });
  }

  private async handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Guild context is required.", ephemeral: true });
      return;
    }

    if (interaction.customId === "hll:v1:players:select") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      const players = await this.api.getPlayers();
      const selected = players.find((player) => player.id === interaction.values[0]);
      if (!selected) {
        await interaction.reply({ content: "That player is no longer in the loaded player list.", ephemeral: true });
        return;
      }

      await this.store.setRecentSelection(interaction.guildId, interaction.user.id, {
        playerId: selected.id,
        label: selected.name,
        selectedAt: new Date().toISOString()
      });

      await interaction.reply({ content: `Selected player: **${selected.name}** (\`${selected.id}\`)`, ephemeral: true });
      return;
    }

    if (interaction.customId === "hll:v2:player_actions:select") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      const players = await this.api.getPlayers();
      const selected = players.find((player) => player.id === interaction.values[0]);
      if (!selected) {
        await interaction.reply({ content: "That player is no longer in the loaded player list.", ephemeral: true });
        return;
      }
      await this.store.setRecentSelection(interaction.guildId, interaction.user.id, {
        playerId: selected.id,
        label: selected.name,
        selectedAt: new Date().toISOString()
      });
      await interaction.reply({ content: `Selected player: **${selected.name}** (\`${selected.id}\`)`, ephemeral: true });
      return;
    }

    if (interaction.customId === "hll:v2:player_search:select") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      const players = await this.api.getPlayers();
      const selected = players.find((player) => player.id === interaction.values[0]);
      if (!selected) {
        await interaction.reply({ content: "That player is no longer in the live player list.", ephemeral: true });
        return;
      }
      await this.store.setRecentSelection(interaction.guildId, interaction.user.id, {
        playerId: selected.id,
        label: selected.name,
        selectedAt: new Date().toISOString()
      });
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("Selected Player")
            .setDescription(`**${selected.name}** (\`${selected.id}\`) is ready for action.`)
            .addFields(
              { name: "Team", value: selected.team || "Unknown", inline: true },
              { name: "Squad", value: selected.squad || "None", inline: true },
              { name: "Next Step", value: "Choose an action below for this player.", inline: false }
            )
        ],
        components: [
          this.buildPlayerActionRow(`hll:v2:player_search:action:${selected.id}`, selected.name),
          this.buildPlayerSearchButtonRow()
        ]
      });
      return;
    }

    if (interaction.customId.startsWith("hll:v2:player_search:action:")) {
      const playerId = interaction.customId.split(":").at(-1);
      if (!playerId) {
        await interaction.reply({ content: "Missing player selection.", ephemeral: true });
        return;
      }

      const players = await this.api.getPlayers();
      const selected = players.find((player) => player.id === playerId);
      if (!selected) {
        await interaction.reply({ content: "That player is no longer in the live player list.", ephemeral: true });
        return;
      }

      await this.store.setRecentSelection(interaction.guildId, interaction.user.id, {
        playerId: selected.id,
        label: selected.name,
        selectedAt: new Date().toISOString()
      });

      const action = interaction.values[0];
      if (!(await this.requireByAction(interaction, action))) {
        return;
      }
      if (action === "player_card") {
        await interaction.reply({ embeds: [createPlayerCard(selected.id, await this.api.getPlayer(selected.id))], ephemeral: true });
        return;
      }

      if (action === "force_switch_death" || action === "force_switch_now") {
        const pending = this.store.createPendingAction({
          actorUserId: interaction.user.id,
          kind: action === "force_switch_now" ? "force_switch_now" : "force_switch_death",
          targetLabel: `${selected.name} (${selected.id})`,
          payload: {
            playerId: selected.id,
            forceMode: action === "force_switch_now" ? 1 : 0
          }
        });

        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setTitle("Confirm Team Switch")
              .setDescription(`Apply **${action === "force_switch_now" ? "immediate" : "on death"}** team switch to **${selected.name}**?`)
          ],
          components: [this.confirmationRow(pending.id)]
        });
        return;
      }

      await this.showPlayerActionModal(interaction, action, selected.id, selected.name);
      return;
    }

    if (interaction.customId !== "hll:v1:players:action" && interaction.customId !== "hll:v2:player_actions:action") {
      if (interaction.customId === "hll:v2:quick_actions:action") {
        if (!(await this.requireByAction(interaction, interaction.values[0]))) return;
        if (interaction.values[0] === "change_map") {
          const modal = new ModalBuilder().setCustomId("hllmodal:v1:change_map").setTitle("Change Current Map").addComponents(modalField("map_name", "Map Name", TextInputStyle.Short));
          await interaction.showModal(modal);
        } else {
          await this.handleSettingsActionSelect(interaction, interaction.values[0]);
        }
      } else if (interaction.customId === "hll:v2:vip_management:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.showAccessActionModal(interaction, interaction.values[0]);
      } else if (interaction.customId === "hll:v2:admin_management:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.showAccessActionModal(interaction, interaction.values[0]);
      } else if (interaction.customId === "hll:v2:bans:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.showBanActionModal(interaction, interaction.values[0]);
      } else if (interaction.customId === "hll:v2:map_management:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.showMapManagementActionModal(interaction, interaction.values[0]);
      } else if (interaction.customId === "hll:v2:server_settings:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.handleSettingsActionSelect(interaction, interaction.values[0]);
      } else if (interaction.customId === "hll:v2:advanced:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.showAdvancedActionModal(interaction, interaction.values[0]);
      }
      if (interaction.customId === "hll:v1:access:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.showAccessActionModal(interaction, interaction.values[0]);
      } else if (interaction.customId === "hll:v1:bans:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.showBanActionModal(interaction, interaction.values[0]);
      } else if (interaction.customId === "hll:v1:settings:action") {
        if (!(await this.requireLevel(interaction, "senior_admin"))) return;
        await this.handleSettingsActionSelect(interaction, interaction.values[0]);
      }
      return;
    }

    const selection = this.store.getRecentSelection(interaction.guildId, interaction.user.id);
    if (!selection) {
      await interaction.reply({ content: "Select a player first.", ephemeral: true });
      return;
    }

    const action = interaction.values[0];
    if (!(await this.requireByAction(interaction, action))) {
      return;
    }
    if (action === "player_card") {
      const detail = await this.api.getPlayer(selection.playerId);
      await interaction.reply({ embeds: [createPlayerCard(selection.playerId, detail)], ephemeral: true });
      return;
    }

    if (action === "force_switch_death" || action === "force_switch_now") {
      const pending = this.store.createPendingAction({
        actorUserId: interaction.user.id,
        kind: action === "force_switch_now" ? "force_switch_now" : "force_switch_death",
        targetLabel: `${selection.label} (${selection.playerId})`,
        payload: {
          playerId: selection.playerId,
          forceMode: action === "force_switch_now" ? 1 : 0
        }
      });

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setTitle("Confirm Team Switch")
            .setDescription(`Apply **${action === "force_switch_now" ? "immediate" : "on death"}** team switch to **${selection.label}**?`)
        ],
        components: [this.confirmationRow(pending.id)]
      });
      return;
    }

    await this.showPlayerActionModal(interaction, action, selection.playerId, selection.label);
  }

  private buildPlayerActionRow(customId: string, playerLabel: string) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(`Choose action for ${playerLabel}`.slice(0, 150))
      .addOptions(
        { label: "💬 Message", value: "message_player", description: "Send a private message" },
        { label: "👢 Kick", value: "kick_player", description: "Remove this player" },
        { label: "⚠️ Punish", value: "punish_player", description: "Punish this player" },
        { label: "⏰ Temp Ban", value: "temp_ban_player", description: "Temporarily ban this player" },
        { label: "🚫 Perm Ban", value: "perma_ban_player", description: "Permanently ban this player" },
        { label: "🔄 Switch Team", value: "force_switch_now", description: "Switch this player immediately" },
        { label: "👥 Remove from Squad", value: "remove_from_squad", description: "Remove from current squad" },
        { label: "👤 View Details", value: "player_card", description: "Open player details" }
      );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }

  private buildPlayerSearchButtonRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("hll:v2:player_search:find_again").setLabel("Search Again").setStyle(ButtonStyle.Secondary)
    );
  }

  private async showFindPlayerModal(interaction: ButtonInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId("hllmodal:v2:player_actions:find")
      .setTitle("Find Player")
      .addComponents(modalField("query", "Player Name", TextInputStyle.Short));
    await interaction.showModal(modal);
  }

  private async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Guild context is required.", ephemeral: true });
      return;
    }

    if (interaction.customId === "hllmodal:v1:change_map") {
      if (!(await this.requireByAction(interaction, "change_map"))) return;
      const mapName = interaction.fields.getTextInputValue("map_name");
      const pending = this.store.createPendingAction({
        actorUserId: interaction.user.id,
        kind: "change_map",
        targetLabel: mapName,
        payload: { mapName }
      });

      await interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setTitle("Confirm Map Change").setDescription(`Change the current map to **${mapName}**?`)],
        components: [this.confirmationRow(pending.id)]
      });
      return;
    }

    if (interaction.customId.startsWith("hllmodal:v1:access:")) {
      if (!(await this.requireLevel(interaction, "senior_admin"))) return;
      await this.handleAccessModal(interaction);
      return;
    }

    if (interaction.customId.startsWith("hllmodal:v1:bans:")) {
      if (!(await this.requireLevel(interaction, "senior_admin"))) return;
      await this.handleBanModal(interaction);
      return;
    }

    if (interaction.customId.startsWith("hllmodal:v1:settings:")) {
      if (!(await this.requireLevel(interaction, "senior_admin"))) return;
      await this.handleSettingsModal(interaction);
      return;
    }

    if (interaction.customId.startsWith("hllmodal:v2:settings:")) {
      if (!(await this.requireLevel(interaction, "senior_admin"))) return;
      await this.handleSettingsModal(interaction);
      return;
    }

    if (interaction.customId.startsWith("hllmodal:v2:map:")) {
      if (!(await this.requireLevel(interaction, "senior_admin"))) return;
      await this.handleMapManagementModal(interaction);
      return;
    }

    if (interaction.customId.startsWith("hllmodal:v2:advanced:")) {
      if (!(await this.requireLevel(interaction, "senior_admin"))) return;
      await this.handleAdvancedModal(interaction);
      return;
    }

    if (interaction.customId === "hllmodal:v2:player_actions:disband") {
      if (!(await this.requireLevel(interaction, "moderator"))) return;
      await this.handleDisbandSquadModal(interaction);
      return;
    }
    if (interaction.customId === "hllmodal:v2:player_actions:find") {
      if (!(await this.requireLevel(interaction, "observer"))) return;
      await this.handleFindPlayerModal(interaction);
      return;
    }

    if (!interaction.customId.startsWith("hllmodal:v1:player_action:")) {
      await interaction.reply({ content: "Unknown modal submitted.", ephemeral: true });
      return;
    }

    const parts = interaction.customId.split(":");
    const action = parts[3];
    if (!(await this.requireByAction(interaction, action))) {
      return;
    }
    const playerId = parts[4];
    const recent = this.store.getRecentSelection(interaction.guildId, interaction.user.id);
    const playerLabel = recent?.playerId === playerId ? recent.label : playerId;

    if (action === "message") {
      const message = interaction.fields.getTextInputValue("message");
      await this.api.messagePlayer(playerId, message);
      await interaction.reply({ content: `Message sent to **${playerLabel}**.`, ephemeral: true });
      await this.sendAudit(interaction.guildId, interaction.user.tag, "Message Player", `${playerLabel} (${playerId})`, message);
      return;
    }

    if (action === "kick") {
      await this.createConfirmedPlayerAction(interaction, "kick", playerId, playerLabel, {
        playerId,
        reason: interaction.fields.getTextInputValue("reason")
      });
      return;
    }

    if (action === "punish") {
      await this.createConfirmedPlayerAction(interaction, "punish", playerId, playerLabel, {
        playerId,
        reason: interaction.fields.getTextInputValue("reason")
      });
      return;
    }

    if (action === "remove_squad") {
      await this.createConfirmedPlayerAction(interaction, "remove_from_squad", playerId, playerLabel, {
        playerId,
        reason: interaction.fields.getTextInputValue("reason")
      });
      return;
    }

    if (action === "temp_ban") {
      await this.createConfirmedPlayerAction(interaction, "temp_ban", playerId, playerLabel, {
        playerId,
        duration: Number(interaction.fields.getTextInputValue("duration_hours")),
        reason: interaction.fields.getTextInputValue("reason"),
        adminName: interaction.fields.getTextInputValue("admin_name") || config.defaultAdminName
      });
      return;
    }

    if (action === "perma_ban") {
      await this.createConfirmedPlayerAction(interaction, "perma_ban", playerId, playerLabel, {
        playerId,
        reason: interaction.fields.getTextInputValue("reason"),
        adminName: interaction.fields.getTextInputValue("admin_name") || config.defaultAdminName
      });
    }
  }

  private async showPlayerActionModal(
    interaction: StringSelectMenuInteraction,
    action: string,
    playerId: string,
    playerLabel: string
  ): Promise<void> {
    if (action === "message_player") {
      const modal = new ModalBuilder()
        .setCustomId(`hllmodal:v1:player_action:message:${playerId}`)
        .setTitle(`Message ${playerLabel}`)
        .addComponents(modalField("message", "Message", TextInputStyle.Paragraph));
      await interaction.showModal(modal);
      return;
    }

    if (action === "kick_player") {
      const modal = new ModalBuilder()
        .setCustomId(`hllmodal:v1:player_action:kick:${playerId}`)
        .setTitle(`Kick ${playerLabel}`)
        .addComponents(modalField("reason", "Reason", TextInputStyle.Paragraph));
      await interaction.showModal(modal);
      return;
    }

    if (action === "punish_player") {
      const modal = new ModalBuilder()
        .setCustomId(`hllmodal:v1:player_action:punish:${playerId}`)
        .setTitle(`Punish ${playerLabel}`)
        .addComponents(modalField("reason", "Reason", TextInputStyle.Paragraph));
      await interaction.showModal(modal);
      return;
    }

    if (action === "temp_ban_player") {
      const modal = new ModalBuilder()
        .setCustomId(`hllmodal:v1:player_action:temp_ban:${playerId}`)
        .setTitle(`Temp Ban ${playerLabel}`)
        .addComponents(
          modalField("duration_hours", "Duration (hours)", TextInputStyle.Short),
          modalField("reason", "Reason", TextInputStyle.Paragraph),
          modalField("admin_name", "Admin Name", TextInputStyle.Short, false, config.defaultAdminName)
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === "perma_ban_player") {
      const modal = new ModalBuilder()
        .setCustomId(`hllmodal:v1:player_action:perma_ban:${playerId}`)
        .setTitle(`Perma Ban ${playerLabel}`)
        .addComponents(
          modalField("reason", "Reason", TextInputStyle.Paragraph),
          modalField("admin_name", "Admin Name", TextInputStyle.Short, false, config.defaultAdminName)
        );
      await interaction.showModal(modal);
      return;
    }

    if (action === "remove_from_squad") {
      const modal = new ModalBuilder()
        .setCustomId(`hllmodal:v1:player_action:remove_squad:${playerId}`)
        .setTitle(`Remove ${playerLabel} From Squad`)
        .addComponents(modalField("reason", "Reason", TextInputStyle.Paragraph));
      await interaction.showModal(modal);
      return;
    }

    await interaction.reply({ content: "This player action is not implemented yet.", ephemeral: true });
  }

  private async showAccessActionModal(interaction: StringSelectMenuInteraction, action: string): Promise<void> {
    if (action === "add_vip") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("hllmodal:v1:access:add_vip")
          .setTitle("Add VIP")
          .addComponents(
            modalField("player_id", "Player ID", TextInputStyle.Short),
            modalField("comment", "Comment", TextInputStyle.Paragraph, false)
          )
      );
      return;
    }

    if (action === "remove_vip") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("hllmodal:v1:access:remove_vip")
          .setTitle("Remove VIP")
          .addComponents(modalField("player_id", "Player ID", TextInputStyle.Short))
      );
      return;
    }

    if (action === "set_vip_slots") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("hllmodal:v1:access:set_vip_slots")
          .setTitle("Set VIP Slots")
          .addComponents(modalField("vip_slots", "VIP Slot Count", TextInputStyle.Short))
      );
      return;
    }

    if (action === "add_admin") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("hllmodal:v1:access:add_admin")
          .setTitle("Add Admin")
          .addComponents(
            modalField("player_id", "Player ID", TextInputStyle.Short),
            modalField("admin_group", "Admin Group", TextInputStyle.Short),
            modalField("comment", "Comment", TextInputStyle.Paragraph, false)
          )
      );
      return;
    }

    if (action === "remove_admin") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("hllmodal:v1:access:remove_admin")
          .setTitle("Remove Admin")
          .addComponents(modalField("player_id", "Player ID", TextInputStyle.Short))
      );
    }
  }

  private normalizeListEntries(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((entry) => typeof entry === "string" ? entry : JSON.stringify(entry)).filter(Boolean);
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const key of ["players", "Players", "bans", "Bans", "data", "Data"]) {
        const nested = record[key];
        if (Array.isArray(nested)) {
          return nested.map((entry) => typeof entry === "string" ? entry : JSON.stringify(entry)).filter(Boolean);
        }
      }
      return Object.values(record).map((entry) => typeof entry === "string" ? entry : JSON.stringify(entry)).filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      return value.split("\n").map((entry) => entry.trim()).filter(Boolean);
    }

    return [];
  }

  private async handleFindPlayerModal(interaction: ModalSubmitInteraction): Promise<void> {
    const query = interaction.fields.getTextInputValue("query").trim().toLowerCase();
    const players = await this.api.getPlayers();
    const filtered = players
      .filter((player) => player.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 25);

    if (filtered.length === 0) {
      await interaction.reply({ content: `No live players matched \`${interaction.fields.getTextInputValue("query")}\`.`, ephemeral: true });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("hll:v2:player_search:select")
      .setPlaceholder(`Choose a match for "${interaction.fields.getTextInputValue("query")}"`)
      .addOptions(
        filtered.map((player) => ({
          label: player.name.slice(0, 100),
          value: player.id,
          description: [player.team, player.squad].filter(Boolean).join(" • ").slice(0, 100) || "No team/squad data"
        }))
      );

    await interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setTitle("Player Search")
          .setDescription(`Found ${filtered.length} live match${filtered.length === 1 ? "" : "es"} for \`${interaction.fields.getTextInputValue("query")}\`.`)
      ],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
    });
  }

  private async showPlayersPage(interaction: ButtonInteraction, page: number, update = false): Promise<void> {
    const players = await this.api.getPlayers();
    const lines = players.map((player) => {
      const detail = [player.team, player.squad, player.role].filter(Boolean).join(" | ");
      return `• ${player.name} (\`${player.id}\`)${detail ? ` - ${detail}` : ""}`;
    });
    const paged = paginateArray(lines, page, 10);
    const embed = new EmbedBuilder()
      .setTitle("Players")
      .setDescription(paged.items.join("\n") || "No players available.")
      .setFooter({ text: `Page ${paged.page + 1} of ${paged.totalPages}` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`hll:v2:player_actions:page:${paged.page - 1}`).setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(paged.page === 0),
      new ButtonBuilder().setCustomId(`hll:v2:player_actions:page:${paged.page + 1}`).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(paged.page >= paged.totalPages - 1)
    );

    if (update) {
      await interaction.update({ embeds: [embed], components: [row], content: "" });
    } else {
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
  }

  private async showBansPage(
    interaction: ButtonInteraction,
    banType: "temp" | "perma",
    page: number,
    update = false
  ): Promise<void> {
    const source = banType === "temp" ? await this.api.getTempBans() : await this.api.getPermaBans();
    const entries = this.normalizeListEntries(source);
    const paged = paginateArray(entries, page, 10);
    const embed = new EmbedBuilder()
      .setTitle(banType === "temp" ? "Temporary Bans" : "Permanent Bans")
      .setDescription(paged.items.map((entry) => `• ${entry}`).join("\n") || "No bans found.")
      .setFooter({ text: `Page ${paged.page + 1} of ${paged.totalPages}` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`hll:v2:bans:page:${banType}:${paged.page - 1}`)
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(paged.page === 0),
      new ButtonBuilder()
        .setCustomId(`hll:v2:bans:page:${banType}:${paged.page + 1}`)
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(paged.page >= paged.totalPages - 1)
    );

    if (update) {
      await interaction.update({ embeds: [embed], components: [row], content: "" });
    } else {
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
  }

  private async showBanActionModal(interaction: StringSelectMenuInteraction, action: string): Promise<void> {
    const modalId = action === "remove_temp_ban" ? "hllmodal:v1:bans:remove_temp_ban" : "hllmodal:v1:bans:remove_perma_ban";
    const title = action === "remove_temp_ban" ? "Remove Temp Ban" : "Remove Perma Ban";
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(modalId)
        .setTitle(title)
        .addComponents(modalField("player_id", "Player ID", TextInputStyle.Short))
    );
  }

  private async showMapManagementActionModal(interaction: StringSelectMenuInteraction, action: string): Promise<void> {
    const modalMap: Record<string, { id: string; title: string; rows: ActionRowBuilder<TextInputBuilder>[] }> = {
      add_map_rotation: { id: "hllmodal:v2:map:add_rotation", title: "Add Map to Rotation", rows: [modalField("map_name", "Map Name", TextInputStyle.Short), modalField("index", "Index", TextInputStyle.Short, false)] },
      remove_map_rotation: { id: "hllmodal:v2:map:remove_rotation", title: "Remove Map from Rotation", rows: [modalField("index", "Index", TextInputStyle.Short)] },
      add_map_sequence: { id: "hllmodal:v2:map:add_sequence", title: "Add Map to Sequence", rows: [modalField("map_name", "Map Name", TextInputStyle.Short), modalField("index", "Index", TextInputStyle.Short, false)] },
      remove_map_sequence: { id: "hllmodal:v2:map:remove_sequence", title: "Remove Map from Sequence", rows: [modalField("index", "Index", TextInputStyle.Short)] },
      move_map_sequence: { id: "hllmodal:v2:map:move_sequence", title: "Move Map in Sequence", rows: [modalField("current_index", "Current Index", TextInputStyle.Short), modalField("new_index", "New Index", TextInputStyle.Short)] },
      toggle_map_shuffle: { id: "hllmodal:v2:map:shuffle", title: "Set Map Shuffle", rows: [modalField("enable", "Enable (true/false)", TextInputStyle.Short)] },
      set_sector_layout: {
        id: "hllmodal:v2:map:sector_layout",
        title: "Set Sector Layout",
        rows: [
          modalField("sector_1", "Sector 1", TextInputStyle.Short),
          modalField("sector_2", "Sector 2", TextInputStyle.Short),
          modalField("sector_3", "Sector 3", TextInputStyle.Short),
          modalField("sector_4", "Sector 4", TextInputStyle.Short),
          modalField("sector_5", "Sector 5", TextInputStyle.Short)
        ]
      }
    };
    const definition = modalMap[action];
    if (!definition) {
      await interaction.reply({ content: "That map action is not implemented yet.", ephemeral: true });
      return;
    }
    await interaction.showModal(new ModalBuilder().setCustomId(definition.id).setTitle(definition.title).addComponents(...definition.rows));
  }

  private async showAdvancedActionModal(interaction: StringSelectMenuInteraction, action: string): Promise<void> {
    if (action === "commands_list") {
      await interaction.reply({ content: this.codeBlock(await this.api.getCommandsList()), ephemeral: true });
      return;
    }
    if (action === "command_reference") {
      await interaction.showModal(new ModalBuilder().setCustomId("hllmodal:v2:advanced:command_reference").setTitle("Get Command Reference").addComponents(modalField("command", "Command", TextInputStyle.Short)));
      return;
    }
    if (action === "dynamic_weather") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId("hllmodal:v2:advanced:dynamic_weather")
          .setTitle("Dynamic Weather")
          .addComponents(
            modalField("map_id", "Map ID", TextInputStyle.Short),
            modalField("enable", "Enable (true/false)", TextInputStyle.Short)
          )
      );
    }
  }

  private async handleSettingsActionSelect(interaction: StringSelectMenuInteraction, action: string): Promise<void> {
    const immediateActions: Record<string, () => Promise<string>> = {
      auto_balance_enable: async () => {
        await this.api.setAutoBalanceEnabled(true);
        return "Auto balance enabled";
      },
      vote_kick_enable: async () => {
        await this.api.setVoteKickEnabled(true);
        return "Vote kick enabled";
      }
    };

    if (action in immediateActions) {
      const result = await immediateActions[action]();
      await interaction.reply({ content: result, ephemeral: true });
      await this.sendAudit(interaction.guildId!, interaction.user.tag, action, "server", result);
      await this.refreshPanel(interaction.guild!, "settings");
      return;
    }

    if (action === "auto_balance_disable" || action === "vote_kick_disable") {
      const pending = this.store.createPendingAction({
        actorUserId: interaction.user.id,
        kind: action,
        targetLabel: "server settings",
        payload: {}
      });
      await interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setTitle("Confirm Setting Change").setDescription(`Confirm **${action.replaceAll("_", " ")}**?`)],
        components: [this.confirmationRow(pending.id)]
      });
      return;
    }

    if (action === "auto_balance_toggle" || action === "vote_kick_toggle") {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId(`hllmodal:v2:settings:${action}`)
          .setTitle(action === "auto_balance_toggle" ? "Set Auto Balance" : "Set Vote Kick")
          .addComponents(modalField("enable", "Enable (true/false)", TextInputStyle.Short))
      );
      return;
    }

    const modalMap: Record<string, { id: string; title: string; rows: ActionRowBuilder<TextInputBuilder>[] }> = {
      broadcast: {
        id: "hllmodal:v1:settings:broadcast",
        title: "Broadcast Message",
        rows: [modalField("message", "Message", TextInputStyle.Paragraph)]
      },
      welcome: {
        id: "hllmodal:v1:settings:welcome",
        title: "Set Welcome Message",
        rows: [modalField("message", "Message", TextInputStyle.Paragraph)]
      },
      team_switch_cooldown: {
        id: "hllmodal:v1:settings:team_switch_cooldown",
        title: "Team Switch Cooldown",
        rows: [modalField("value", "Cooldown", TextInputStyle.Short)]
      },
      max_queue: {
        id: "hllmodal:v1:settings:max_queue",
        title: "Max Queue Size",
        rows: [modalField("value", "Queue Size", TextInputStyle.Short)]
      },
      idle_kick: {
        id: "hllmodal:v1:settings:idle_kick",
        title: "Idle Kick Timer",
        rows: [modalField("value", "Minutes", TextInputStyle.Short)]
      },
      high_ping: {
        id: "hllmodal:v1:settings:high_ping",
        title: "High Ping Threshold",
        rows: [modalField("value", "Milliseconds", TextInputStyle.Short)]
      },
      auto_balance_threshold: {
        id: "hllmodal:v1:settings:auto_balance_threshold",
        title: "Auto Balance Threshold",
        rows: [modalField("value", "Threshold", TextInputStyle.Short)]
      },
      vote_kick_threshold: {
        id: "hllmodal:v1:settings:vote_kick_threshold",
        title: "Vote Kick Threshold",
        rows: [modalField("value", "Threshold Value", TextInputStyle.Short)]
      },
      add_banned_words: {
        id: "hllmodal:v1:settings:add_banned_words",
        title: "Add Banned Words",
        rows: [modalField("words", "Words", TextInputStyle.Paragraph)]
      },
      remove_banned_words: {
        id: "hllmodal:v1:settings:remove_banned_words",
        title: "Remove Banned Words",
        rows: [modalField("words", "Words", TextInputStyle.Paragraph)]
      },
      set_match_timer: {
        id: "hllmodal:v2:settings:set_match_timer",
        title: "Set Match Timer",
        rows: [modalField("game_mode", "Game Mode", TextInputStyle.Short), modalField("value", "Match Length", TextInputStyle.Short)]
      },
      remove_match_timer: {
        id: "hllmodal:v2:settings:remove_match_timer",
        title: "Remove Match Timer",
        rows: [modalField("game_mode", "Game Mode", TextInputStyle.Short)]
      },
      set_warmup_timer: {
        id: "hllmodal:v2:settings:set_warmup_timer",
        title: "Set Warmup Timer",
        rows: [modalField("game_mode", "Game Mode", TextInputStyle.Short), modalField("value", "Warmup Length", TextInputStyle.Short)]
      },
      remove_warmup_timer: {
        id: "hllmodal:v2:settings:remove_warmup_timer",
        title: "Remove Warmup Timer",
        rows: [modalField("game_mode", "Game Mode", TextInputStyle.Short)]
      }
    };

    const definition = modalMap[action];
    if (!definition) {
      await interaction.reply({ content: "That settings action is not implemented yet.", ephemeral: true });
      return;
    }

    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(definition.id)
        .setTitle(definition.title)
        .addComponents(...definition.rows)
    );
  }

  private async handleAccessModal(interaction: ModalSubmitInteraction): Promise<void> {
    const action = interaction.customId.split(":").at(-1);
    if (!action) {
      await interaction.reply({ content: "Unknown access action.", ephemeral: true });
      return;
    }

    let result = "Done";
    switch (action) {
      case "add_vip":
        await this.api.addVIP(
          interaction.fields.getTextInputValue("player_id"),
          interaction.fields.getTextInputValue("comment") || ""
        );
        result = "VIP added";
        break;
      case "remove_vip":
        {
          const playerId = interaction.fields.getTextInputValue("player_id");
          const pending = this.store.createPendingAction({
            actorUserId: interaction.user.id,
            kind: "remove_vip",
            targetLabel: playerId,
            payload: { playerId }
          });
          await interaction.reply({
            ephemeral: true,
            embeds: [new EmbedBuilder().setTitle("Confirm VIP Removal").setDescription(`Remove VIP status from \`${playerId}\`?`)],
            components: [this.confirmationRow(pending.id)]
          });
          return;
        }
      case "set_vip_slots":
        await this.api.setVipSlots(Number(interaction.fields.getTextInputValue("vip_slots")));
        result = "VIP slots updated";
        break;
      case "add_admin":
        await this.api.addAdmin(
          interaction.fields.getTextInputValue("player_id"),
          interaction.fields.getTextInputValue("admin_group"),
          interaction.fields.getTextInputValue("comment") || ""
        );
        result = "Admin added";
        break;
      case "remove_admin":
        {
          const playerId = interaction.fields.getTextInputValue("player_id");
          const pending = this.store.createPendingAction({
            actorUserId: interaction.user.id,
            kind: "remove_admin",
            targetLabel: playerId,
            payload: { playerId }
          });
          await interaction.reply({
            ephemeral: true,
            embeds: [new EmbedBuilder().setTitle("Confirm Admin Removal").setDescription(`Remove admin privileges from \`${playerId}\`?`)],
            components: [this.confirmationRow(pending.id)]
          });
          return;
        }
      default:
        await interaction.reply({ content: "Unknown access action.", ephemeral: true });
        return;
    }

    await interaction.reply({ content: result, ephemeral: true });
    await this.sendAudit(interaction.guildId!, interaction.user.tag, action, "access", result);
    await this.refreshPanel(interaction.guild!, "access");
  }

  private async handleBanModal(interaction: ModalSubmitInteraction): Promise<void> {
    const action = interaction.customId.split(":").at(-1);
    const playerId = interaction.fields.getTextInputValue("player_id");
    if (action === "remove_temp_ban") {
      const pending = this.store.createPendingAction({
        actorUserId: interaction.user.id,
        kind: "remove_temp_ban",
        targetLabel: playerId,
        payload: { playerId }
      });
      await interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setTitle("Confirm Temp Ban Removal").setDescription(`Remove the temporary ban for \`${playerId}\`?`)],
        components: [this.confirmationRow(pending.id)]
      });
      return;
    }

    if (action === "remove_perma_ban") {
      const pending = this.store.createPendingAction({
        actorUserId: interaction.user.id,
        kind: "remove_perma_ban",
        targetLabel: playerId,
        payload: { playerId }
      });
      await interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setTitle("Confirm Perma Ban Removal").setDescription(`Remove the permanent ban for \`${playerId}\`?`)],
        components: [this.confirmationRow(pending.id)]
      });
    }
  }

  private async handleSettingsModal(interaction: ModalSubmitInteraction): Promise<void> {
    const action = interaction.customId.split(":").at(-1);
    let result = "Updated";

    switch (action) {
      case "broadcast":
        await this.api.broadcast(interaction.fields.getTextInputValue("message"));
        result = "Broadcast sent";
        break;
      case "welcome":
        await this.api.setWelcomeMessage(interaction.fields.getTextInputValue("message"));
        result = "Welcome message updated";
        break;
      case "team_switch_cooldown":
        await this.api.setTeamSwitchCooldown(Number(interaction.fields.getTextInputValue("value")));
        result = "Team switch cooldown updated";
        break;
      case "max_queue":
        await this.api.setMaxQueuedPlayers(Number(interaction.fields.getTextInputValue("value")));
        result = "Max queue size updated";
        break;
      case "idle_kick":
        await this.api.setIdleKickDuration(Number(interaction.fields.getTextInputValue("value")));
        result = "Idle kick timer updated";
        break;
      case "high_ping":
        await this.api.setHighPingThreshold(Number(interaction.fields.getTextInputValue("value")));
        result = "High ping threshold updated";
        break;
      case "auto_balance_threshold":
        await this.api.setAutoBalanceThreshold(Number(interaction.fields.getTextInputValue("value")));
        result = "Auto balance threshold updated";
        break;
      case "vote_kick_threshold":
        await this.api.setVoteKickThreshold(interaction.fields.getTextInputValue("value"));
        result = "Vote kick threshold updated";
        break;
      case "add_banned_words":
        await this.api.addBannedWords(interaction.fields.getTextInputValue("words"));
        result = "Banned words added";
        break;
      case "remove_banned_words":
        {
          const words = interaction.fields.getTextInputValue("words");
          const pending = this.store.createPendingAction({
            actorUserId: interaction.user.id,
            kind: "remove_banned_words",
            targetLabel: "banned words",
            payload: { words }
          });
          await interaction.reply({
            ephemeral: true,
            embeds: [new EmbedBuilder().setTitle("Confirm Banned Word Removal").setDescription(`Remove these banned words?\n\n${words}`)],
            components: [this.confirmationRow(pending.id)]
          });
          return;
        }
      case "auto_balance_toggle":
        await this.api.setAutoBalanceEnabled(interaction.fields.getTextInputValue("enable").toLowerCase() === "true");
        result = "Auto balance updated";
        break;
      case "vote_kick_toggle":
        await this.api.setVoteKickEnabled(interaction.fields.getTextInputValue("enable").toLowerCase() === "true");
        result = "Vote kick updated";
        break;
      case "set_match_timer":
        await this.api.setMatchTimer(interaction.fields.getTextInputValue("game_mode"), Number(interaction.fields.getTextInputValue("value")));
        result = "Match timer updated";
        break;
      case "remove_match_timer":
        await this.api.removeMatchTimer(interaction.fields.getTextInputValue("game_mode"));
        result = "Match timer removed";
        break;
      case "set_warmup_timer":
        await this.api.setWarmupTimer(interaction.fields.getTextInputValue("game_mode"), Number(interaction.fields.getTextInputValue("value")));
        result = "Warmup timer updated";
        break;
      case "remove_warmup_timer":
        await this.api.removeWarmupTimer(interaction.fields.getTextInputValue("game_mode"));
        result = "Warmup timer removed";
        break;
      default:
        await interaction.reply({ content: "Unknown settings action.", ephemeral: true });
        return;
    }

    await interaction.reply({ content: result, ephemeral: true });
    await this.sendAudit(interaction.guildId!, interaction.user.tag, action, "server", result);
    await this.refreshPanel(interaction.guild!, "server_settings");
  }

  private async handleMapManagementModal(interaction: ModalSubmitInteraction): Promise<void> {
    const action = interaction.customId.split(":").at(-1);
    let result = "Updated";
    switch (action) {
      case "add_rotation":
        await this.api.addMapToRotation(interaction.fields.getTextInputValue("map_name"), Number(interaction.fields.getTextInputValue("index") || "0"));
        result = "Map added to rotation";
        break;
      case "remove_rotation":
        await this.api.removeMapFromRotation(Number(interaction.fields.getTextInputValue("index")));
        result = "Map removed from rotation";
        break;
      case "add_sequence":
        await this.api.addMapToSequence(interaction.fields.getTextInputValue("map_name"), Number(interaction.fields.getTextInputValue("index") || "0"));
        result = "Map added to sequence";
        break;
      case "remove_sequence":
        await this.api.removeMapFromSequence(Number(interaction.fields.getTextInputValue("index")));
        result = "Map removed from sequence";
        break;
      case "move_sequence":
        await this.api.moveMapInSequence(Number(interaction.fields.getTextInputValue("current_index")), Number(interaction.fields.getTextInputValue("new_index")));
        result = "Map sequence reordered";
        break;
      case "shuffle":
        await this.api.setMapShuffleEnabled(interaction.fields.getTextInputValue("enable").toLowerCase() === "true");
        result = "Map shuffle updated";
        break;
      case "sector_layout":
        await this.api.setSectorLayout([
          interaction.fields.getTextInputValue("sector_1"),
          interaction.fields.getTextInputValue("sector_2"),
          interaction.fields.getTextInputValue("sector_3"),
          interaction.fields.getTextInputValue("sector_4"),
          interaction.fields.getTextInputValue("sector_5")
        ]);
        result = "Sector layout updated";
        break;
      default:
        await interaction.reply({ content: "Unknown map management action.", ephemeral: true });
        return;
    }
    await interaction.reply({ content: result, ephemeral: true });
    await this.sendAudit(interaction.guildId!, interaction.user.tag, action, "map management", result);
    await this.refreshPanel(interaction.guild!, "map_management");
  }

  private async handleAdvancedModal(interaction: ModalSubmitInteraction): Promise<void> {
    const action = interaction.customId.split(":").at(-1);
    if (action === "command_reference") {
      const result = await this.api.getCommandReference(interaction.fields.getTextInputValue("command"));
      await interaction.reply({ content: this.codeBlock(result), ephemeral: true });
      return;
    }
    if (action === "dynamic_weather") {
      await this.api.setDynamicWeather(
        interaction.fields.getTextInputValue("map_id"),
        interaction.fields.getTextInputValue("enable").toLowerCase() === "true"
      );
      await interaction.reply({ content: "Dynamic weather updated.", ephemeral: true });
      await this.sendAudit(interaction.guildId!, interaction.user.tag, "dynamic_weather", "advanced", "Dynamic weather updated");
      await this.refreshPanel(interaction.guild!, "advanced");
    }
  }

  private async handleDisbandSquadModal(interaction: ModalSubmitInteraction): Promise<void> {
    await this.api.disbandSquad(
      Number(interaction.fields.getTextInputValue("team_index")),
      Number(interaction.fields.getTextInputValue("squad_index")),
      interaction.fields.getTextInputValue("reason") || ""
    );
    await interaction.reply({ content: "Squad disbanded.", ephemeral: true });
    await this.sendAudit(interaction.guildId!, interaction.user.tag, "disband_squad", "player actions", "Squad disbanded");
    await this.refreshPanel(interaction.guild!, "player_actions");
  }

  private async createConfirmedPlayerAction(
    interaction: ModalSubmitInteraction,
    kind: PendingAction["kind"],
    playerId: string,
    playerLabel: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const pending = this.store.createPendingAction({
      actorUserId: interaction.user.id,
      kind,
      targetLabel: `${playerLabel} (${playerId})`,
      payload
    });

    await interaction.reply({
      ephemeral: true,
      embeds: [new EmbedBuilder().setTitle("Confirm Action").setDescription(`Confirm **${kind}** for **${playerLabel}**?`)],
      components: [this.confirmationRow(pending.id)]
    });
  }

  private confirmationRow(pendingId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`hll:v1:confirm:${pendingId}`).setLabel("Confirm").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`hll:v1:cancel:${pendingId}`).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );
  }

  private async executePendingAction(interaction: ButtonInteraction): Promise<void> {
    const pendingId = interaction.customId.split(":").at(-1);
    if (!pendingId) {
      await interaction.reply({ content: "Missing pending action ID.", ephemeral: true });
      return;
    }

    const pending = this.store.getPendingAction(pendingId);
    if (!pending) {
      await interaction.reply({ content: "That confirmation expired or was already used.", ephemeral: true });
      return;
    }

    if (pending.actorUserId !== interaction.user.id) {
      await interaction.reply({ content: "Only the admin who initiated this action can confirm it.", ephemeral: true });
      return;
    }

    let resultSummary = "Success";
    switch (pending.kind) {
      case "kick":
        await this.api.kickPlayer(String(pending.payload.playerId), String(pending.payload.reason ?? ""));
        resultSummary = `Kicked with reason: ${String(pending.payload.reason ?? "")}`;
        break;
      case "punish":
        await this.api.punishPlayer(String(pending.payload.playerId), String(pending.payload.reason ?? ""));
        resultSummary = `Punished with reason: ${String(pending.payload.reason ?? "")}`;
        break;
      case "temp_ban":
        await this.api.tempBanPlayer(
          String(pending.payload.playerId),
          Number(pending.payload.duration),
          String(pending.payload.reason ?? ""),
          String(pending.payload.adminName ?? config.defaultAdminName)
        );
        resultSummary = `Temp banned for ${String(pending.payload.duration)} hour(s)`;
        break;
      case "perma_ban":
        await this.api.permaBanPlayer(
          String(pending.payload.playerId),
          String(pending.payload.reason ?? ""),
          String(pending.payload.adminName ?? config.defaultAdminName)
        );
        resultSummary = "Permanent ban applied";
        break;
      case "remove_from_squad":
        await this.api.removeFromSquad(String(pending.payload.playerId), String(pending.payload.reason ?? ""));
        resultSummary = `Removed from squad: ${String(pending.payload.reason ?? "")}`;
        break;
      case "force_switch_death":
        await this.api.forceTeamSwitch(String(pending.payload.playerId), 0);
        resultSummary = "Team switch queued for death";
        break;
      case "force_switch_now":
        await this.api.forceTeamSwitch(String(pending.payload.playerId), 1);
        resultSummary = "Team switch applied immediately";
        break;
      case "change_map":
        await this.api.changeMap(String(pending.payload.mapName));
        resultSummary = `Map changed to ${String(pending.payload.mapName)}`;
        await this.refreshPanel(interaction.guild!, "maps");
        break;
      case "remove_vip":
        await this.api.removeVIP(String(pending.payload.playerId));
        resultSummary = "VIP removed";
        await this.refreshPanel(interaction.guild!, "access");
        break;
      case "remove_admin":
        await this.api.removeAdmin(String(pending.payload.playerId));
        resultSummary = "Admin removed";
        await this.refreshPanel(interaction.guild!, "access");
        break;
      case "remove_temp_ban":
        await this.api.removeTempBan(String(pending.payload.playerId));
        resultSummary = "Temporary ban removed";
        await this.refreshPanel(interaction.guild!, "bans");
        break;
      case "remove_perma_ban":
        await this.api.removePermaBan(String(pending.payload.playerId));
        resultSummary = "Permanent ban removed";
        await this.refreshPanel(interaction.guild!, "bans");
        break;
      case "reset_vote_kick":
        await this.api.resetVoteKickThreshold();
        resultSummary = "Vote kick threshold reset";
        await this.refreshPanel(interaction.guild!, "settings");
        break;
      case "auto_balance_disable":
        await this.api.setAutoBalanceEnabled(false);
        resultSummary = "Auto balance disabled";
        await this.refreshPanel(interaction.guild!, "settings");
        break;
      case "vote_kick_disable":
        await this.api.setVoteKickEnabled(false);
        resultSummary = "Vote kick disabled";
        await this.refreshPanel(interaction.guild!, "settings");
        break;
      case "remove_banned_words":
        await this.api.removeBannedWords(String(pending.payload.words ?? ""));
        resultSummary = "Banned words removed";
        await this.refreshPanel(interaction.guild!, "settings");
        break;
    }

    this.store.deletePendingAction(pending.id);
    await interaction.update({ content: `Action completed: ${resultSummary}`, embeds: [], components: [] });
    await this.sendAudit(interaction.guildId!, interaction.user.tag, pending.kind, pending.targetLabel, resultSummary);

    if (["kick", "punish", "temp_ban", "perma_ban", "remove_from_squad", "force_switch_death", "force_switch_now"].includes(pending.kind)) {
      await this.refreshPanel(interaction.guild!, "players");
    }
  }

  private async setupGuild(guild: Guild, forceRebuild = false): Promise<void> {
    const category = await this.ensureCategory(guild);
    const quickActionsChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.quick_actions, category, "Quick Actions panel.");
    const playerActionsChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.player_actions, category, "Player Actions panel.");
    const bansChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.bans, category, "Bans panel.");
    const vipChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.vip_management, category, "VIP Management panel.");
    const adminChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.admin_management, category, "Admin Management panel.");
    const serverInfoChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.server_info, category, "Server Info panel.");
    const mapChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.map_management, category, "Map Management panel.");
    const serverSettingsChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.server_settings, category, "Server Settings panel.");
    const advancedChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.advanced, category, "Advanced panel.");
    const auditChannel = await this.ensureTextChannel(guild, PANEL_CHANNELS.audit, category, "Persistent audit log for Discord-triggered HLL actions.");

    await this.store.setAuditChannelId(guild.id, auditChannel.id);
    await this.upsertPanelMessage(guild, quickActionsChannel, "quick_actions", forceRebuild);
    await this.upsertPanelMessage(guild, playerActionsChannel, "player_actions", forceRebuild);
    await this.upsertPanelMessage(guild, bansChannel, "bans", forceRebuild);
    await this.upsertPanelMessage(guild, vipChannel, "vip_management", forceRebuild);
    await this.upsertPanelMessage(guild, adminChannel, "admin_management", forceRebuild);
    await this.upsertPanelMessage(guild, serverInfoChannel, "server_info", forceRebuild);
    await this.upsertPanelMessage(guild, mapChannel, "map_management", forceRebuild);
    await this.upsertPanelMessage(guild, serverSettingsChannel, "server_settings", forceRebuild);
    await this.upsertPanelMessage(guild, advancedChannel, "advanced", forceRebuild);
  }

  private async refreshAllPanels(guild: Guild): Promise<void> {
    await this.refreshPanel(guild, "quick_actions");
    await this.refreshPanel(guild, "player_actions");
    await this.refreshPanel(guild, "bans");
    await this.refreshPanel(guild, "vip_management");
    await this.refreshPanel(guild, "admin_management");
    await this.refreshPanel(guild, "server_info");
    await this.refreshPanel(guild, "map_management");
    await this.refreshPanel(guild, "server_settings");
    await this.refreshPanel(guild, "advanced");
  }

  private async tryStartupRefresh(guild: Guild): Promise<void> {
    const quickActions = this.store.getPanel(guild.id, "quick_actions");
    const playerActions = this.store.getPanel(guild.id, "player_actions");
    const bans = this.store.getPanel(guild.id, "bans");
    const vipManagement = this.store.getPanel(guild.id, "vip_management");
    const adminManagement = this.store.getPanel(guild.id, "admin_management");
    const serverInfo = this.store.getPanel(guild.id, "server_info");
    const mapManagement = this.store.getPanel(guild.id, "map_management");
    const serverSettings = this.store.getPanel(guild.id, "server_settings");
    const advanced = this.store.getPanel(guild.id, "advanced");

    if (!quickActions && !playerActions && !bans && !vipManagement && !adminManagement && !serverInfo && !mapManagement && !serverSettings && !advanced) {
      return;
    }

    try {
      await this.refreshAllPanels(guild);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown startup refresh error";
      console.warn(`Startup panel refresh skipped: ${message}`);
    }
  }

  private async resolveStartupGuild(): Promise<Guild | null> {
    const configured = this.client.guilds.cache.get(config.discordGuildId);
    if (configured) {
      return configured;
    }

    try {
      return await this.client.guilds.fetch(config.discordGuildId);
    } catch {
      const fallback = this.client.guilds.cache.first();
      if (fallback) {
        console.warn(`Configured guild ${config.discordGuildId} was not available to the bot. Falling back to guild ${fallback.id}.`);
        return fallback;
      }
    }

    return null;
  }

  private async refreshPanel(guild: Guild, panelKey: PanelKey): Promise<void> {
    const panel = this.store.getPanel(guild.id, panelKey);
    if (!panel) {
      throw new Error(`Panel ${panelKey} is not tracked yet. Run /hll-panels setup first.`);
    }

    const channel = await guild.channels.fetch(panel.channelId);
    if (!channel?.isTextBased()) {
      throw new Error(`Panel channel missing for ${panelKey}.`);
    }

    const message = await (channel as TextChannel).messages.fetch(panel.messageId);
    await message.edit((await this.renderPanel(panelKey)) as any);
    await this.store.setPanel(guild.id, {
      panelKey,
      channelId: panel.channelId,
      messageId: panel.messageId,
      updatedAt: new Date().toISOString()
    });
  }

  private async upsertPanelMessage(guild: Guild, channel: TextChannel, panelKey: PanelKey, forceRebuild: boolean): Promise<void> {
    const existing = this.store.getPanel(guild.id, panelKey);
    const payload = (await this.renderPanel(panelKey)) as any;

    if (existing && !forceRebuild) {
      try {
        const message = await channel.messages.fetch(existing.messageId);
        await message.edit(payload);
        await this.store.setPanel(guild.id, {
          panelKey,
          channelId: channel.id,
          messageId: message.id,
          updatedAt: new Date().toISOString()
        });
        return;
      } catch {
        // Recreate below.
      }
    }

    const message = await channel.send(payload);
    await message.pin();
    await this.store.setPanel(guild.id, {
      panelKey,
      channelId: channel.id,
      messageId: message.id,
      updatedAt: new Date().toISOString()
    });
  }

  private async renderPanel(panelKey: PanelKey) {
    if (panelKey === "quick_actions") {
      return createQuickActionsMessage();
    }
    if (panelKey === "player_actions") {
      return createPlayerActionsMessage(await this.api.getPlayers());
    }
    if (panelKey === "bans") {
      const [tempBans, permaBans] = await Promise.all([this.api.getTempBans(), this.api.getPermaBans()]);
      return createBansMessage(tempBans, permaBans);
    }
    if (panelKey === "vip_management") {
      return createVipManagementMessage(await this.api.getVIPs());
    }
    if (panelKey === "admin_management") {
      const [admins, groups] = await Promise.all([this.api.getAdmins(), this.api.getAdminGroups()]);
      return createAdminManagementMessage(admins, groups);
    }
    if (panelKey === "server_info" || panelKey === "overview") {
      return createServerInfoMessage(await this.api.getOverviewSnapshot());
    }
    if (panelKey === "map_management" || panelKey === "maps") {
      const [rotation, sequence] = await Promise.all([this.api.getMapRotation(), this.api.getMapSequence()]);
      return createMapManagementMessage(rotation, sequence);
    }
    if (panelKey === "server_settings" || panelKey === "settings") {
      return createServerSettingsMessage(await this.api.getProfanities());
    }
    if (panelKey === "advanced") {
      return createAdvancedMessage(await this.api.getServerBuild());
    }
    if (panelKey === "players") {
      return createPlayerActionsMessage(await this.api.getPlayers());
    }
    return createAdminManagementMessage(await this.api.getAdmins(), await this.api.getAdminGroups());
  }

  private async ensureCategory(guild: Guild): Promise<CategoryChannel> {
    const existing = guild.channels.cache.find(
      (channel): channel is CategoryChannel => channel.type === ChannelType.GuildCategory && channel.name === config.categoryName
    );
    if (existing) {
      return existing;
    }

    return guild.channels.create({
      name: config.categoryName,
      type: ChannelType.GuildCategory,
      reason: "HLL persistent admin panel category"
    });
  }

  private async ensureTextChannel(guild: Guild, name: string, category: CategoryChannel, topic: string): Promise<TextChannel> {
    const existing = guild.channels.cache.find(
      (channel): channel is TextChannel => channel.type === ChannelType.GuildText && channel.name === name
    );
    if (existing) {
      return existing;
    }

    return guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
      topic,
      reason: "Create HLL admin control channel"
    });
  }

  private async sendAudit(guildId: string, actorTag: string, action: string, target: string, result: string): Promise<void> {
    const auditChannelId = this.store.getAuditChannelId(guildId);
    if (!auditChannelId) {
      return;
    }

    const guild = await this.client.guilds.fetch(guildId);
    const channel = (await guild.channels.fetch(auditChannelId)) as GuildBasedChannel | null;
    if (!channel?.isTextBased()) {
      return;
    }

    await (channel as TextChannel).send({
      embeds: [createAuditEmbed(actorTag, action, target, result)]
    });
  }

  private codeBlock(value: unknown): string {
    const content = JSON.stringify(value, null, 2) ?? "null";
    return `\`\`\`json\n${content.slice(0, 1800)}\n\`\`\``;
  }
}
