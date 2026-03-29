# Discord Persistent Panels Spec

## Goal

Design a Discord-based control surface for Hell Let Loose server administration using `hllrcon` as the backend for all supported RCON actions. The Discord experience should mirror the current admin capabilities exposed by the REST API while adapting them to Discord's interaction model:

- Persistent messages as the primary control surface
- Buttons, select menus, and modals for actions
- Ephemeral responses for confirmations and errors
- Audit logging for every state-changing action
- Restart-safe panel recovery

This document is based on the current API surface in `api/routes.go` and `api/handlers.go`.

## Design Principles

1. Keep persistent messages stable.
Panels should remain posted in dedicated admin channels and be updated in place rather than recreated for normal use.

2. Separate read-heavy and write-heavy workflows.
Read-only status panels should not be mixed with dangerous moderation and settings actions.

3. Use ephemeral interactions for detail and confirmation.
Discord channels should not be flooded with one-off admin outputs, player lookup details, or form validation errors.

4. Require explicit confirmation for destructive actions.
Kick, ban, map change, squad disband, and removal actions should use confirm/cancel steps.

5. Treat `hllrcon` as the system of record for command execution.
The Discord bot should call the existing HTTP API rather than reimplementing the raw RCON protocol.

6. Make the bot restart-safe.
All persistent panel messages and component handlers must be reconstructable from stored metadata.

## Source Feature Groups

The current backend groups naturally into these admin domains:

- Connection and server status
- Players and moderation
- VIP management
- Admin management
- Ban management
- Map rotation and map sequence
- Server messaging
- Match and queue settings
- Auto-balance and vote kick settings
- Timers and weather
- Profanity filter
- Audit and admin logs

## Recommended Discord Channel Layout

Create a Discord category named `HLL Control`.

Recommended channels:

- `#hll-overview`
- `#hll-players`
- `#hll-access`
- `#hll-bans`
- `#hll-maps`
- `#hll-settings`
- `#hll-audit`
- `#hll-bot-admin`

Purpose of each channel:

- `#hll-overview`
  - Read-only persistent server overview panel
  - Optional live status refreshes
- `#hll-players`
  - Player moderation and direct player actions
- `#hll-access`
  - VIP and admin role management
- `#hll-bans`
  - Temporary and permanent ban review/revocation
- `#hll-maps`
  - Map changes, rotation, sequence, shuffle, sector layout
- `#hll-settings`
  - Global server settings and content controls
- `#hll-audit`
  - Append-only bot action log
- `#hll-bot-admin`
  - Setup, reconnect, panel rebuild, diagnostics

## Persistent Panel Inventory

Use one pinned persistent message per panel.

### Panel 1: Server Overview

Channel: `#hll-overview`

Purpose:

- Show high-level server state
- Provide navigation into deeper workflows
- Give admins a safe first panel to refresh

Backed by:

- `GET /api/v2/connection/status`
- `GET /api/v2/server`
- `GET /api/v2/players`
- `GET /api/v2/map-rotation`
- `GET /api/v2/map-sequence`
- `GET /api/v2/changelist`
- `GET /api/v2/logs`

Embed content:

- Server name
- Connected host and port
- Current map and game mode if available
- Player count
- Queue count if available
- VIP slot count if available
- Auto-balance status if available
- Vote kick status if available
- Last refresh timestamp
- Changelist/build number

Components:

- `Refresh`
- `Players`
- `Rotation`
- `Sequence`
- `Logs`
- `Settings`

Behavior:

- `Refresh` edits the panel embed in place
- Other buttons return ephemeral detail views or deep-link responses that tell the admin which panel/channel to use

### Panel 2: Player Operations

Channel: `#hll-players`

Purpose:

- Handle live player admin work
- Keep common moderation tasks fast

Backed by:

- `GET /api/v2/players`
- `GET /api/v2/players/:id`
- `POST /api/v2/players/:id/message`
- `POST /api/v2/kick`
- `POST /api/v2/punish`
- `POST /api/v2/temp-ban`
- `POST /api/v2/perma-ban`
- `POST /api/v2/force-team-switch`
- `POST /api/v2/remove-from-squad`

Embed content:

- Player count
- Last refresh time
- Quick summary by team if available
- Hint text: "Select a player, then choose an action"

Components:

- player select menu
- `Refresh`
- action select menu
- `Open Player Card`

Action menu values:

- `message_player`
- `kick_player`
- `punish_player`
- `temp_ban_player`
- `perma_ban_player`
- `force_team_switch_death`
- `force_team_switch_now`
- `remove_from_squad`

Interaction flow:

1. Admin refreshes player list.
2. Admin selects a player.
3. Admin chooses an action.
4. Bot opens a modal if more input is required.
5. Bot sends a confirm step for destructive actions.
6. Bot executes the API request.
7. Bot responds ephemerally with the result.
8. Bot writes an audit entry to `#hll-audit`.

Modals:

- Message Player
  - `message`
- Kick Player
  - `reason`
- Punish Player
  - `reason`
- Temp Ban
  - `duration_hours`
  - `reason`
  - `admin_name`
- Perma Ban
  - `reason`
  - `admin_name`
- Remove From Squad
  - `reason`

Open Player Card response:

- Steam ID / player ID
- name
- team
- squad
- role if available
- level if available
- score or stats if available
- quick action buttons for the selected player

### Panel 3: VIP and Admin Access

Channel: `#hll-access`

Purpose:

- Manage privileged lists
- Separate access control from live moderation

Backed by:

- `GET /api/v2/vips`
- `POST /api/v2/vips`
- `DELETE /api/v2/vips`
- `POST /api/v2/vip-slots`
- `GET /api/v2/admins`
- `GET /api/v2/admin-groups`
- `POST /api/v2/admins`
- `DELETE /api/v2/admins`

Embed sections:

- VIP count
- Admin count
- Current VIP slot count if available
- Last refresh time

Components:

- `Refresh Access Lists`
- `View VIPs`
- `Add VIP`
- `Remove VIP`
- `Set VIP Slots`
- `View Admins`
- `Add Admin`
- `Remove Admin`

Modals:

- Add VIP
  - `player_id`
  - `comment`
- Remove VIP
  - `player_id`
- Set VIP Slots
  - `vip_slot_count`
- Add Admin
  - `player_id`
  - `admin_group`
  - `comment`
- Remove Admin
  - `player_id`

Nice-to-have:

- If a player is selected recently in the player panel, prefill `player_id`
- Use admin group select menu populated from `GET /api/v2/admin-groups`

### Panel 4: Ban Management

Channel: `#hll-bans`

Purpose:

- Review punishment state separately from live player operations
- Make reversal workflows safe and auditable

Backed by:

- `GET /api/v2/bans?type=temp`
- `GET /api/v2/bans?type=perma`
- `DELETE /api/v2/temp-ban`
- `DELETE /api/v2/perma-ban`

Embed content:

- active temp ban count
- active permanent ban count
- last refresh time
- selected list type

Components:

- list type select: `temp`, `perma`
- paginated ban select menu
- `Refresh Bans`
- `Revoke Selected Ban`

Interaction flow:

1. Admin chooses temp or perma list.
2. Bot loads first page of bans.
3. Admin selects a ban target.
4. Bot shows an ephemeral detail card.
5. Admin clicks `Revoke Selected Ban`.
6. Bot asks for confirmation.
7. Bot executes the matching remove-ban API.
8. Bot refreshes counts and writes audit log.

### Panel 5: Map Control

Channel: `#hll-maps`

Purpose:

- Control active map and future map order

Backed by:

- `GET /api/v2/maps`
- `GET /api/v2/map-rotation`
- `GET /api/v2/map-sequence`
- `POST /api/v2/change-map`
- `POST /api/v2/map-rotation`
- `DELETE /api/v2/map-rotation`
- `POST /api/v2/map-sequence`
- `DELETE /api/v2/map-sequence`
- `PUT /api/v2/map-sequence/move`
- `POST /api/v2/map-shuffle`
- `POST /api/v2/sector-layout`

Embed content:

- current rotation length
- current sequence length
- shuffle status if available
- current next map if detectable
- last refresh time

Components:

- `Refresh Maps`
- `Change Map`
- `View Rotation`
- `Add Rotation Map`
- `Remove Rotation Map`
- `View Sequence`
- `Add Sequence Map`
- `Remove Sequence Map`
- `Move Sequence Map`
- `Toggle Shuffle`
- `Set Sector Layout`

Modals:

- Change Map
  - `map_name`
- Add Rotation Map
  - `map_name`
  - `index`
- Remove Rotation Map
  - `index`
- Add Sequence Map
  - `map_name`
  - `index`
- Remove Sequence Map
  - `index`
- Move Sequence Map
  - `current_index`
  - `new_index`
- Set Sector Layout
  - `sector_1`
  - `sector_2`
  - `sector_3`
  - `sector_4`
  - `sector_5`

Implementation note:

- `GET /api/v2/maps` should be cached in memory and used to populate select menus
- `Change Map` should use a confirm step because it is one of the highest-impact actions

### Panel 6: Server Settings

Channel: `#hll-settings`

Purpose:

- Group lower-frequency but high-importance server controls

Backed by:

- `POST /api/v2/broadcast`
- `POST /api/v2/welcome-message`
- `POST /api/v2/team-switch-cooldown`
- `POST /api/v2/max-queued-players`
- `POST /api/v2/idle-kick-duration`
- `POST /api/v2/high-ping-threshold`
- `POST /api/v2/auto-balance/enabled`
- `POST /api/v2/auto-balance/threshold`
- `POST /api/v2/vote-kick/enabled`
- `POST /api/v2/vote-kick/threshold`
- `POST /api/v2/vote-kick/reset`
- `POST /api/v2/match-timer`
- `DELETE /api/v2/match-timer`
- `POST /api/v2/warmup-timer`
- `DELETE /api/v2/warmup-timer`
- `POST /api/v2/dynamic-weather`
- `GET /api/v2/profanities`
- `POST /api/v2/profanities`
- `DELETE /api/v2/profanities`

To avoid hitting Discord's component limits, split this into subpanels.

#### Panel 6A: Messaging and Queue

Components:

- `Broadcast Message`
- `Set Welcome Message`
- `Set Team Switch Cooldown`
- `Set Max Queue Size`
- `Set Idle Kick Timer`
- `Set High Ping Threshold`

#### Panel 6B: Balance and Vote Kick

Components:

- `Toggle Auto Balance`
- `Set Auto Balance Threshold`
- `Toggle Vote Kick`
- `Set Vote Kick Threshold`
- `Reset Vote Kick Threshold`

#### Panel 6C: Timers and Weather

Components:

- `Set Match Timer`
- `Remove Match Timer`
- `Set Warmup Timer`
- `Remove Warmup Timer`
- `Set Dynamic Weather`

#### Panel 6D: Profanity Controls

Components:

- `View Banned Words`
- `Add Banned Words`
- `Remove Banned Words`

Modals:

- Broadcast Message
  - `message`
- Set Welcome Message
  - `message`
- Set Team Switch Cooldown
  - `team_switch_timer`
- Set Max Queue Size
  - `max_queued_players`
- Set Idle Kick Timer
  - `idle_timeout_minutes`
- Set High Ping Threshold
  - `high_ping_threshold_ms`
- Set Auto Balance Threshold
  - `auto_balance_threshold`
- Set Vote Kick Threshold
  - `threshold_value`
- Set Match Timer
  - `game_mode`
  - `match_length`
- Remove Match Timer
  - `game_mode`
- Set Warmup Timer
  - `game_mode`
  - `warmup_length`
- Remove Warmup Timer
  - `game_mode`
- Set Dynamic Weather
  - `map_id`
  - `enable`
- Add Banned Words
  - `banned_words`
- Remove Banned Words
  - `banned_words`

Toggle-style actions:

- Auto balance enabled
- Vote kick enabled
- Dynamic weather enabled
- Map shuffle enabled

These should be implemented with explicit `Enable` and `Disable` buttons rather than a single ambiguous toggle when current state is not guaranteed to be loaded.

## Persistent Message Structure

Each panel message should contain:

- One main embed
- One optional secondary embed for current counts or tips
- Up to 5 action rows

Each persistent panel should include:

- title
- short description
- current connection target
- last refresh timestamp
- stale indicator if the panel data is older than a threshold

Suggested stale thresholds:

- Overview: 60 seconds
- Players: 30 seconds
- Bans: 5 minutes
- Access lists: 10 minutes
- Maps: 5 minutes
- Settings: 10 minutes

## Component ID Scheme

Component IDs must be deterministic and versioned so handlers can evolve safely.

Recommended format:

`hll:v1:<panel>:<action>:<context>`

Examples:

- `hll:v1:overview:refresh`
- `hll:v1:players:select_player`
- `hll:v1:players:action:kick`
- `hll:v1:players:confirm:tempban`
- `hll:v1:maps:action:change_map`
- `hll:v1:settings:votekick:enable`

Rules:

- Keep IDs under Discord limits
- Never embed secrets in component IDs
- Use short context tokens and keep full data in state storage

## Modal ID Scheme

Recommended format:

`hllmodal:v1:<workflow>`

Examples:

- `hllmodal:v1:message_player`
- `hllmodal:v1:kick_player`
- `hllmodal:v1:add_admin`
- `hllmodal:v1:set_match_timer`

## Bot State and Persistence Model

Use a database for durable panel recovery and transient workflow state.

### Tables

#### `guild_configs`

- `guild_id`
- `api_base_url`
- `api_username` nullable
- `api_password` nullable
- `default_admin_name`
- `created_at`
- `updated_at`

#### `panel_messages`

- `guild_id`
- `channel_id`
- `message_id`
- `panel_key`
- `panel_version`
- `created_by`
- `created_at`
- `updated_at`
- `last_refresh_at`

`panel_key` values:

- `overview`
- `players`
- `access`
- `bans`
- `maps`
- `settings_messaging`
- `settings_balance`
- `settings_timers`
- `settings_profanity`

#### `panel_cache`

- `guild_id`
- `panel_key`
- `cache_json`
- `etag` nullable
- `refreshed_at`

Purpose:

- store last successful panel data
- survive brief API outages
- support stale embeds after restarts

#### `interaction_sessions`

- `session_id`
- `guild_id`
- `user_id`
- `workflow_key`
- `state_json`
- `expires_at`
- `created_at`

Purpose:

- store selected player
- store pending confirmation payload
- store modal prefill context

#### `audit_events`

- `id`
- `guild_id`
- `user_id`
- `channel_id`
- `panel_key`
- `action_key`
- `target_id`
- `request_json`
- `result_status`
- `result_json`
- `created_at`

## Permissions Model

Discord role checks should happen before any API call.

Recommended roles:

- `HLL Admin`
  - full access to all panels
- `HLL Moderator`
  - player messaging, kick, punish, temp-ban, logs, player lookup
- `HLL Senior Admin`
  - permanent bans, admin management, map control, settings
- `HLL Observer`
  - read-only overview access

Suggested action policy:

- Observer
  - refresh overview
  - view players
  - view rotation
  - view sequence
- Moderator
  - message player
  - kick
  - punish
  - temp ban
  - remove from squad
- Senior Admin
  - permanent ban
  - revoke bans
  - change map
  - manage rotation/sequence
  - manage VIP/admin
  - change server settings

## API Integration Strategy

The Discord bot should call the existing `hllrcon` REST API.

Why this is the preferred design:

- reuses existing command validation and request formats
- keeps all RCON-specific behavior in one service
- makes web UI and Discord bot behavior easier to keep aligned
- reduces transport-specific bugs

### API Client Requirements

- support cookie or auth strategy used by deployed `hllrcon`
- maintain a connection session to the target server
- reconnect if session expires
- expose typed wrapper functions for each route
- normalize JSON and non-JSON response bodies

### Session Handling

Because `hllrcon` currently uses session cookies for active RCON connections:

- the bot should authenticate to `hllrcon` once per guild/server target
- it should maintain a cookie jar per guild target
- it should periodically verify `GET /api/v2/connection/status`
- if disconnected, it should attempt reconnect using stored target credentials

If you want multi-server support later:

- one guild can map to one active HLL server target
- or one guild can map to multiple named targets with a target selector in `#hll-bot-admin`

## Workflow Patterns

### Pattern A: Read-only Refresh

Use for overview, rotation, sequence, logs, VIP list, admin list, bans.

Flow:

1. Admin clicks refresh/view button.
2. Bot calls API.
3. Bot edits panel or replies ephemerally with paginated details.
4. Bot updates `panel_cache`.

### Pattern B: Immediate Write with Modal

Use for messaging, thresholds, durations, counts, welcome message.

Flow:

1. Admin clicks button.
2. Bot opens modal.
3. Admin submits values.
4. Bot validates locally.
5. Bot executes API request.
6. Bot returns ephemeral result.
7. Bot logs audit event.
8. Bot refreshes affected panel counts if needed.

### Pattern C: Destructive Write with Confirmation

Use for kick, ban, map change, revoke ban, disband squad, remove VIP/admin.

Flow:

1. Admin selects target and action.
2. Bot opens modal if additional input is needed.
3. Bot presents summary with `Confirm` and `Cancel`.
4. Confirmation expires after 60 seconds.
5. Bot executes API request only after confirmation.
6. Bot returns ephemeral result and audit log.

## Audit Log Format

Every write action should post a structured embed to `#hll-audit`.

Audit embed fields:

- action
- actor
- target
- server target
- request summary
- result
- timestamp

Examples:

- `Kick Player`
- `Temporary Ban`
- `Remove Admin`
- `Change Map`
- `Set Vote Kick Threshold`

Sensitive handling:

- never include server RCON password
- do not dump raw cookie/session tokens
- truncate long messages and reasons if necessary

## Error Handling

All failures should be visible to the acting admin and quiet to everyone else.

Error classes:

- permission denied
- missing selection
- modal validation error
- API unavailable
- session expired
- RCON command failed
- stale target reference

Response rules:

- use ephemeral error messages
- include short human-readable cause
- include retry guidance where useful
- if the backend is disconnected, offer `Reconnect Bot Backend` in `#hll-bot-admin`

## Pagination and Discord Limits

Many lists may exceed Discord select menu and embed field limits.

Handle with:

- page state in `interaction_sessions`
- `Prev` and `Next` buttons
- truncated labels
- detailed ephemeral card on selection

Hard cases:

- large player counts
- large ban lists
- long map rotation/sequence
- profanity lists with many entries

## Setup and Recovery Flows

### Initial Setup Command

Recommended slash command:

`/hll-panels setup`

Responsibilities:

- validate bot permissions
- validate configured channels
- connect to `hllrcon`
- create or refresh all persistent panel messages
- save `panel_messages`

### Rebuild Command

Recommended slash command:

`/hll-panels rebuild`

Responsibilities:

- recreate missing panel messages
- preserve channel mapping
- update stored message IDs

### Refresh All Command

Recommended slash command:

`/hll-panels refresh-all`

Responsibilities:

- refresh every panel cache
- edit each persistent panel message

### Startup Recovery

On bot startup:

1. Load all `panel_messages`.
2. Re-register views/components.
3. Check that each message still exists.
4. Rebuild missing messages.
5. Load cached embed state if the API is temporarily unavailable.

## Suggested Internal Module Layout

If building as a separate bot service, use this structure:

```text
discord-bot/
  src/
    bot/
      startup.ts
      routing.ts
      permissions.ts
    api/
      hllrcon-client.ts
      auth-session.ts
      dto.ts
    panels/
      overview-panel.ts
      players-panel.ts
      access-panel.ts
      bans-panel.ts
      maps-panel.ts
      settings-panel.ts
    workflows/
      player-actions.ts
      ban-actions.ts
      map-actions.ts
      settings-actions.ts
    persistence/
      panel-store.ts
      session-store.ts
      audit-store.ts
    views/
      embeds.ts
      components.ts
      modals.ts
    commands/
      setup.ts
      rebuild.ts
      refresh-all.ts
      connect.ts
```

This can be implemented in TypeScript with `discord.js` for the bot and a lightweight HTTP client for the API.

## API Coverage Matrix

Every currently important admin-facing API command should map to a Discord home:

| API Route | Discord Home |
| --- | --- |
| `/api/v2/server` | Overview |
| `/api/v2/players` | Overview, Players |
| `/api/v2/players/:id` | Players |
| `/api/v2/players/:id/message` | Players |
| `/api/v2/kick` | Players |
| `/api/v2/punish` | Players |
| `/api/v2/temp-ban` | Players, Bans |
| `/api/v2/perma-ban` | Players, Bans |
| `/api/v2/force-team-switch` | Players |
| `/api/v2/remove-from-squad` | Players |
| `/api/v2/vips` | Access |
| `/api/v2/vip-slots` | Access |
| `/api/v2/admins` | Access |
| `/api/v2/admin-groups` | Access |
| `/api/v2/bans` | Bans |
| `/api/v2/broadcast` | Settings |
| `/api/v2/welcome-message` | Settings |
| `/api/v2/change-map` | Maps |
| `/api/v2/map-rotation` | Maps |
| `/api/v2/map-sequence` | Maps |
| `/api/v2/map-shuffle` | Maps |
| `/api/v2/sector-layout` | Maps |
| `/api/v2/team-switch-cooldown` | Settings |
| `/api/v2/max-queued-players` | Settings |
| `/api/v2/idle-kick-duration` | Settings |
| `/api/v2/high-ping-threshold` | Settings |
| `/api/v2/auto-balance/enabled` | Settings |
| `/api/v2/auto-balance/threshold` | Settings |
| `/api/v2/vote-kick/enabled` | Settings |
| `/api/v2/vote-kick/threshold` | Settings |
| `/api/v2/vote-kick/reset` | Settings |
| `/api/v2/match-timer` | Settings |
| `/api/v2/warmup-timer` | Settings |
| `/api/v2/dynamic-weather` | Settings |
| `/api/v2/profanities` | Settings |
| `/api/v2/logs` | Overview |
| `/api/v2/changelist` | Overview |
| `/api/v2/maps` | Maps |

## MVP Recommendation

Build in phases.

### Phase 1

- Overview panel
- Player operations panel
- Map control panel
- Audit logging
- Setup and rebuild commands

This delivers the majority of day-to-day admin value.

### Phase 2

- Access panel
- Ban management panel
- Core settings subpanels

### Phase 3

- Multi-server support
- richer player card detail
- auto-refresh background updates
- alerting and scheduled status snapshots

## Open Decisions

These should be resolved before implementation starts:

1. Will one Discord guild manage one HLL server or multiple named server targets?
2. Where will server credentials be stored for automatic reconnect?
3. Should write actions be available only via persistent panels, or also mirrored as slash commands?
4. What bot role mapping should be enforced for moderators versus senior admins?
5. Should audit logs include raw API payloads or only summarized fields?

## Recommended Next Step

Implement a thin Discord bot service against the current `hllrcon` REST API, starting with:

- `/hll-panels setup`
- `overview` persistent panel
- `players` persistent panel
- `maps` persistent panel
- `#hll-audit` write logging

That scope is large enough to prove the architecture without committing to all settings workflows at once.
