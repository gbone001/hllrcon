// Players management component
// Displays and manages connected players

import { ApiService } from '../services/api.js';
import { ResponseComponent } from './response.js';
import { FormattingUtils } from '../utils/formatting.js';

export class PlayersComponent {
    static currentPlayers = [];

    // Render the players page
    static renderPlayersPage() {
        const interfaceCard = document.getElementById('interfaceCard');
        if (!interfaceCard) return;

        // Update menu button states
        this.setActiveMenuButton('liveViewMenuBtn');

        // Use full width layout for players view (same width as menu bar)
        interfaceCard.innerHTML = `
            <div class="players-width">
                <div class="card players-card">
                    <div class="players-header">
                        <h2>Live View</h2>
                        <div class="header-actions">
                            <button class="copy-button small" onclick="refreshLiveView()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                    
                    <!-- Live Match Data Section -->
                    <div class="live-match-data" id="liveMatchData">
                        <div class="loading-message">Loading match data...</div>
                    </div>
                    
                    <!-- Players Section -->
                    <div class="players-section">
                        <div class="players-section-header">
                            <h3>Connected Players</h3>
                            <div class="players-count" id="playersCount">0 players</div>
                        </div>
                        <div class="players-content" id="playersContent">
                            <div class="loading-message">Loading players...</div>
                        </div>
                    </div>
                    <div class="version-footer">
                        <div class="footer-left">
                            Made with ❤️ by
                            <a
                                href="https://discord.com/users/392644735355060225"
                                target="_blank"
                                rel="noopener noreferrer"
                            >SLAPPY</a>
                        </div>
                        <div class="footer-right">
                            <a
                                href="https://hllrcon.com"
                                target="_blank"
                                class="footer-link"
                            >hllrcon.com</a>
                            <span class="footer-separator">•</span>
                            <a
                                id="appVersionPlayers"
                                href="https://github.com/Sledro/hllrcon"
                                target="_blank"
                                class="footer-link"
                            >v0.0.0</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load both match data and players
        this.loadMatchData();
        this.loadPlayers();

        // Update version in players footer
        this.updateVersionFooter('appVersionPlayers');
    }

    // Load and display players
    static async loadPlayers() {
        const content = document.getElementById('playersContent');
        if (!content) return;

        try {
            // Show loading
            content.innerHTML = '<div class="loading-message">Loading players...</div>';

            // Get players data
            const result = await ApiService.executeCommand({
                name: 'GetPlayers',
                method: 'GET',
                path: '/api/v2/server?type=players'
            });

            if (result.success && result.data) {
                let playersData = result.data;

                // Handle different response formats
                if (playersData.players) {
                    playersData = playersData.players;
                } else if (Array.isArray(playersData)) {
                    // Already an array
                } else if (typeof playersData === 'string') {
                    try {
                        playersData = JSON.parse(playersData);
                        if (playersData.players) {
                            playersData = playersData.players;
                        }
                    } catch (e) {
                        throw new Error('Invalid player data format');
                    }
                }

                this.currentPlayers = playersData;
                this.renderPlayersList(playersData);
            } else {
                content.innerHTML = '<div class="error-message">Failed to load players: ' + (result.error || 'Unknown error') + '</div>';
            }
        } catch (error) {
            content.innerHTML = '<div class="error-message">Error loading players: ' + error.message + '</div>';
        }
    }

    // Render the players list as a compact table
    static renderPlayersList(players) {
        const content = document.getElementById('playersContent');
        if (!content) return;

        if (!players || players.length === 0) {
            content.innerHTML = '<div class="empty-message">No players currently connected</div>';
            return;
        }

        let html = `
            <div class="players-stats">
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-number">${players.length}</span>
                        <span class="stat-label">Total Players</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${players.filter(p => p.team === 0).length}</span>
                        <span class="stat-label">Axis Team</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${players.filter(p => p.team === 1).length}</span>
                        <span class="stat-label">Allies Team</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${Math.round(players.reduce((sum, p) => sum + p.level, 0) / players.length)}</span>
                        <span class="stat-label">Avg Level</span>
                    </div>
                </div>
            </div>
            <div class="players-table-container">
                <table class="players-table">
                    <thead>
                        <tr>
                            <th class="col-name">Player</th>
                            <th class="col-team">Team</th>
                            <th class="col-level">Level</th>
                            <th class="col-kd">K/D</th>
                            <th class="col-score">Score</th>
                            <th class="col-role">Role</th>
                            <th class="col-squad">Squad</th>
                            <th class="col-platform">Platform</th>
                            <th class="col-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Sort players by team, then by score
        const sortedPlayers = [...players].sort((a, b) => {
            if (a.team !== b.team) return a.team - b.team;
            return this.getTotalScore(b.scoreData) - this.getTotalScore(a.scoreData);
        });

        sortedPlayers.forEach((player, index) => {
            const team = player.team === 0 ? 'Axis' : player.team === 1 ? 'Allies' : 'Spec';
            const teamClass = player.team === 0 ? 'axis' : player.team === 1 ? 'allies' : 'spectator';
            const roleName = this.getRoleName(player.role);
            const kdr = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toString();

            html += `
                <tr class="player-row" onclick="togglePlayerDetails('player-${index}')">
                    <td class="col-name">
                        <div class="player-name-cell">
                            <span class="player-name">${this.escapeHTML(player.name)}</span>
                            ${player.clanTag ? `<span class="clan-tag">[${this.escapeHTML(player.clanTag)}]</span>` : ''}
                        </div>
                    </td>
                    <td class="col-team">
                        <span class="team-badge ${teamClass}">${team}</span>
                    </td>
                    <td class="col-level">
                        <span class="level-display" data-level="${this.getLevelCategory(player.level)}">${player.level}</span>
                    </td>
                    <td class="col-kd">
                        <span class="kd-display">${player.kills}/${player.deaths}</span>
                        <span class="kdr-display" data-kdr="${this.getKDRCategory(kdr)}">${kdr}</span>
                    </td>
                    <td class="col-score">
                        <span class="score-display" data-score="${this.getScoreCategory(this.getTotalScore(player.scoreData))}">${this.getTotalScore(player.scoreData)}</span>
                    </td>
                    <td class="col-role">
                        <span class="role-display" data-role="${player.role}">${roleName}</span>
                    </td>
                    <td class="col-squad">
                        ${player.platoon ? `<span class="squad-display">${player.platoon}</span>` : '<span class="no-squad">-</span>'}
                    </td>
                    <td class="col-platform">
                        <span class="platform-badge" data-platform="${(player.platform || 'unk').toLowerCase()}">${(player.platform || 'UNK').toUpperCase()}</span>
                    </td>
                    <td class="col-actions">
                        <div class="action-buttons">
                            <button class="action-btn message-btn" onclick="messagePlayer('${player.iD}', '${this.escapeHTML(player.name)}'); event.stopPropagation();" title="Message Player">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                </svg>
                            </button>
                            <button class="action-btn punish-btn" onclick="punishPlayer('${player.iD}', '${this.escapeHTML(player.name)}'); event.stopPropagation();" title="Punish Player">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
                                </svg>
                            </button>
                            <button class="action-btn switch-btn" onclick="switchPlayerTeam('${player.iD}', '${this.escapeHTML(player.name)}'); event.stopPropagation();" title="Switch Team">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
                                </svg>
                            </button>
                            <button class="action-btn kick-btn" onclick="kickPlayer('${player.iD}', '${this.escapeHTML(player.name)}'); event.stopPropagation();" title="Kick Player">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr class="player-details-row" id="player-${index}" style="display: none;">
                    <td colspan="9">
                        ${this.renderPlayerDetails(player)}
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;

        // Store players data for details panel
        this.currentPlayers = sortedPlayers;

        // Update player count display
        const playersCountEl = document.getElementById('playersCount');
        if (playersCountEl && Array.isArray(sortedPlayers)) {
            playersCountEl.textContent = `${sortedPlayers.length} players`;
        }
    }

    // Get role name from role number
    static getRoleName(roleId) {
        const roles = {
            0: 'Officer',
            1: 'Rifleman',
            2: 'Assault',
            3: 'Automatic Rifleman',
            4: 'Medic',
            5: 'Support',
            6: 'Heavy MG',
            7: 'Anti-Tank',
            8: 'Engineer',
            9: 'Tank Commander',
            10: 'Tank Crewman',
            11: 'Spotter',
            12: 'Sniper',
            13: 'Machine Gunner'
        };
        return roles[roleId] || `Role ${roleId}`;
    }

    // Categorize K/D ratio for color coding
    static getKDRCategory(kdr) {
        const ratio = parseFloat(kdr);
        if (ratio >= 2.0) return 'high';
        if (ratio >= 1.0) return 'medium';
        return 'low';
    }

    // Categorize score for color coding
    static getScoreCategory(score) {
        if (score >= 1000) return 'high';
        if (score >= 500) return 'medium';
        return 'low';
    }

    // Categorize level for color coding
    static getLevelCategory(level) {
        if (level >= 100) return 'veteran';
        if (level >= 50) return 'experienced';
        if (level >= 25) return 'intermediate';
        return 'novice';
    }

    // Toggle player details row
    static togglePlayerDetails(rowId) {
        const detailsRow = document.getElementById(rowId);
        if (detailsRow) {
            const isVisible = detailsRow.style.display !== 'none';

            // Close all other detail rows
            const allDetailRows = document.querySelectorAll('.player-details-row');
            allDetailRows.forEach(row => {
                if (row.id !== rowId) {
                    row.style.display = 'none';
                }
            });

            // Toggle the clicked row
            detailsRow.style.display = isVisible ? 'none' : 'table-row';
        }
    }

    // Show player details in right panel
    static showPlayerDetails(playerId, playerName, playerIndex) {
        const player = this.currentPlayers[playerIndex];
        if (!player) return;

        const detailsPanel = document.getElementById('playerDetails');
        if (!detailsPanel) return;

        const roleName = this.getRoleName(player.role);
        const team = player.team === 0 ? 'Axis' : player.team === 1 ? 'Allies' : 'Spectator';
        const teamClass = player.team === 0 ? 'axis' : player.team === 1 ? 'allies' : 'spectator';

        detailsPanel.innerHTML = `
            <div class="selected-player-details">
                <div class="player-header-section">
                    <h3 class="player-detail-name">
                        ${this.escapeHTML(player.name)}
                        ${player.clanTag ? `<span class="clan-tag">[${this.escapeHTML(player.clanTag)}]</span>` : ''}
                    </h3>
                    <div class="player-badges">
                        <span class="team-badge ${teamClass}">${team}</span>
                        <span class="level-display" data-level="${this.getLevelCategory(player.level)}">Level ${player.level}</span>
                        <span class="role-display" data-role="${player.role}">${roleName}</span>
                    </div>
                </div>

                <div class="detail-stats-grid">
                    <div class="stat-group">
                        <h4>Performance</h4>
                        <div class="stat-row">
                            <span class="stat-name">Kills:</span>
                            <span class="stat-value">${player.kills}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Deaths:</span>
                            <span class="stat-value">${player.deaths}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">K/D Ratio:</span>
                            <span class="kdr-display" data-kdr="${this.getKDRCategory(player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills)}">${player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Total Score:</span>
                            <span class="score-display" data-score="${this.getScoreCategory(this.getTotalScore(player.scoreData))}">${this.getTotalScore(player.scoreData)}</span>
                        </div>
                    </div>

                    <div class="stat-group">
                        <h4>Score Breakdown</h4>
                        <div class="stat-row">
                            <span class="stat-name">Combat:</span>
                            <span class="stat-value">${player.scoreData?.cOMBAT || 0}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Defense:</span>
                            <span class="stat-value">${player.scoreData?.defense || 0}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Offense:</span>
                            <span class="stat-value">${player.scoreData?.offense || 0}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Support:</span>
                            <span class="stat-value">${player.scoreData?.support || 0}</span>
                        </div>
                    </div>

                    <div class="stat-group">
                        <h4>Player Info</h4>
                        <div class="stat-row">
                            <span class="stat-name">Platform:</span>
                            <span class="platform-badge" data-platform="${(player.platform || 'unk').toLowerCase()}">${(player.platform || 'UNK').toUpperCase()}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Squad:</span>
                            <span class="stat-value">${player.platoon ? `<span class="squad-display">${player.platoon}</span>` : 'No Squad'}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Loadout:</span>
                            <span class="stat-value">${player.loadout || 'Standard Issue'}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-name">Position:</span>
                            <span class="stat-value">X:${player.worldPosition?.x || 0} Y:${player.worldPosition?.y || 0} Z:${player.worldPosition?.z || 0}</span>
                        </div>
                    </div>
                </div>

                <div class="player-actions-section">
                    <h4>Admin Actions</h4>
                    <div class="detail-actions-grid">
                        <button class="detail-action-btn message-action" onclick="messagePlayer('${player.iD}', '${this.escapeHTML(player.name)}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                            </svg>
                            Message Player
                        </button>
                        <button class="detail-action-btn kick-action" onclick="kickPlayer('${player.iD}', '${this.escapeHTML(player.name)}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            Kick Player
                        </button>
                        <button class="detail-action-btn punish-action" onclick="punishPlayer('${player.iD}', '${this.escapeHTML(player.name)}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78C15.57 19.36 13.86 20 12 20s-3.57-.64-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33C4.62 15.49 4 13.82 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83z"/>
                            </svg>
                            Punish Player
                        </button>
                        <button class="detail-action-btn switch-action" onclick="switchPlayerTeam('${player.iD}', '${this.escapeHTML(player.name)}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
                            </svg>
                            Switch Team
                        </button>
                    </div>
                    
                    <div class="player-ids">
                        <div class="id-section">
                            <span class="id-label">Player ID:</span>
                            <span class="player-id selectable">${player.iD}</span>
                        </div>
                        <div class="id-section">
                            <span class="id-label">EOS ID:</span>
                            <span class="player-id selectable">${player.eosId || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render detailed player information (compact for table)
    static renderPlayerDetails(player) {
        return `
            <div class="player-details-section">
                <div class="details-grid">
                    <div class="detail-group">
                        <h4>Basic Info</h4>
                        <div class="detail-item">
                            <span class="detail-label">Loadout:</span>
                            <span class="detail-value">${player.loadout || 'Standard Issue'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">EOS ID:</span>
                            <span class="detail-value player-id">${player.eosId || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Player ID:</span>
                            <span class="detail-value player-id">${player.iD}</span>
                        </div>
                    </div>
                    <div class="detail-group">
                        <h4>Score Breakdown</h4>
                        <div class="score-breakdown">
                            <div class="score-item">
                                <span class="score-type">Combat:</span>
                                <span class="score-num">${player.scoreData?.cOMBAT || 0}</span>
                            </div>
                            <div class="score-item">
                                <span class="score-type">Defense:</span>
                                <span class="score-num">${player.scoreData?.defense || 0}</span>
                            </div>
                            <div class="score-item">
                                <span class="score-type">Offense:</span>
                                <span class="score-num">${player.scoreData?.offense || 0}</span>
                            </div>
                            <div class="score-item">
                                <span class="score-type">Support:</span>
                                <span class="score-num">${player.scoreData?.support || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div class="detail-group">
                        <h4>Position</h4>
                        <div class="detail-item">
                            <span class="detail-label">Coordinates:</span>
                            <span class="detail-value">X: ${player.worldPosition?.x || 0}, Y: ${player.worldPosition?.y || 0}, Z: ${player.worldPosition?.z || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Actions:</span>
                            <div class="detail-actions">
                                <button class="detail-action-btn" onclick="punishPlayer('${player.iD}', '${this.escapeHTML(player.name)}'); event.stopPropagation();">Punish</button>
                                <button class="detail-action-btn" onclick="switchPlayerTeam('${player.iD}', '${this.escapeHTML(player.name)}'); event.stopPropagation();">Switch Team</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Calculate total score
    static getTotalScore(scoreData) {
        if (!scoreData) return 0;
        return (scoreData.cOMBAT || 0) +
            (scoreData.defense || 0) +
            (scoreData.offense || 0) +
            (scoreData.support || 0);
    }

    // Escape HTML to prevent XSS
    static escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // Set active menu button state
    static setActiveMenuButton(activeButtonId) {
        // Remove active class from all menu buttons
        const menuButtons = document.querySelectorAll('.menu-button');
        menuButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to the specified button
        const activeButton = document.getElementById(activeButtonId);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }


    // Player action handlers
    static async messagePlayer(playerId, playerName) {
        const message = prompt(`Send message to ${playerName}:`);
        if (!message) return;

        try {
            const result = await ApiService.executeCommand({
                name: 'MessagePlayer',
                method: 'POST',
                path: '/api/v2/players/:id/message'
            }, {
                player_id: playerId,
                message: message
            });

            if (result.success) {
                ResponseComponent.showSuccess(`Message sent to ${playerName}`);
            } else {
                ResponseComponent.showError(`Failed to message player: ${result.error}`);
            }
        } catch (error) {
            ResponseComponent.showError(`Error messaging player: ${error.message}`);
        }
    }

    static async kickPlayer(playerId, playerName) {
        const reason = prompt(`Reason for kicking ${playerName}:`) || 'Admin action';
        if (!confirm(`Kick ${playerName}? Reason: ${reason}`)) return;

        try {
            const result = await ApiService.executeCommand({
                name: 'KickPlayer',
                method: 'POST',
                path: '/api/v2/kick'
            }, {
                player_id: playerId,
                reason: reason
            });

            if (result.success) {
                ResponseComponent.showSuccess(`${playerName} has been kicked`);
                // Refresh players list
                setTimeout(() => this.loadPlayers(), 1000);
            } else {
                ResponseComponent.showError(`Failed to kick player: ${result.error}`);
            }
        } catch (error) {
            ResponseComponent.showError(`Error kicking player: ${error.message}`);
        }
    }

    static async punishPlayer(playerId, playerName) {
        const reason = prompt(`Reason for punishing ${playerName}:`) || 'Admin action';
        if (!confirm(`Punish ${playerName}? (This will kill their character) Reason: ${reason}`)) return;

        try {
            const result = await ApiService.executeCommand({
                name: 'PunishPlayer',
                method: 'POST',
                path: '/api/v2/punish'
            }, {
                player_id: playerId,
                reason: reason
            });

            if (result.success) {
                ResponseComponent.showSuccess(`${playerName} has been punished`);
            } else {
                ResponseComponent.showError(`Failed to punish player: ${result.error}`);
            }
        } catch (error) {
            ResponseComponent.showError(`Error punishing player: ${error.message}`);
        }
    }

    static async switchPlayerTeam(playerId, playerName) {
        const forceMode = confirm(`Switch ${playerName}'s team immediately? (Click Cancel for 'on death')`);
        if (!confirm(`Force team switch for ${playerName}?`)) return;

        try {
            const result = await ApiService.executeCommand({
                name: 'ForceTeamSwitch',
                method: 'POST',
                path: '/api/v2/force-team-switch'
            }, {
                player_id: playerId,
                force_mode: forceMode ? 1 : 0
            });

            if (result.success) {
                ResponseComponent.showSuccess(`${playerName} team switch initiated`);
            } else {
                ResponseComponent.showError(`Failed to switch player team: ${result.error}`);
            }
        } catch (error) {
            ResponseComponent.showError(`Error switching player team: ${error.message}`);
        }
    }

    // Update version information in footer using cached data
    static updateVersionFooter(versionElementId) {
        if (window.appVersionData) {
            const versionEl = document.getElementById(versionElementId);
            const githubLinkEl = document.getElementById("githubLink");

            if (versionEl) {
                versionEl.textContent = window.appVersionData.version;
                versionEl.href = window.appVersionData.githubUrl;
                versionEl.title = window.appVersionData.title;
            }

            if (githubLinkEl) {
                githubLinkEl.href = window.appVersionData.githubUrl;
            }
        }
    }

    // Load live match data
    static async loadMatchData() {
        const matchContainer = document.getElementById('liveMatchData');
        if (!matchContainer) return;

        try {
            matchContainer.innerHTML = '<div class="loading-message">Loading match data...</div>';

            // Fetch session data (scores, time, map info)
            const sessionResult = await ApiService.executeCommand({
                name: 'GetSessionData',
                method: 'GET',
                path: '/api/v2/server?type=session'
            });

            // Fetch server config (current map, etc.)
            const configResult = await ApiService.executeCommand({
                name: 'GetServerConfig',
                method: 'GET',
                path: '/api/v2/server?type=serverconfig'
            });

            if (sessionResult.success && configResult.success) {
                this.renderMatchData(sessionResult.data, configResult.data);
            } else {
                matchContainer.innerHTML = '<div class="error-message">Failed to load match data</div>';
            }
        } catch (error) {
            console.error('Error loading match data:', error);
            matchContainer.innerHTML = '<div class="error-message">Error loading match data</div>';
        }
    }

    // Render match data
    static renderMatchData(sessionData, configData) {
        const matchContainer = document.getElementById('liveMatchData');
        if (!matchContainer) return;

        try {
            // Parse the data (adjust based on actual API response structure)
            let currentMap = 'Unknown Map';
            let timeRemaining = 'Unknown';
            let alliedScore = 0;
            let axisScore = 0;
            let maxPlayers = 100;
            let currentPlayers = 0;

            // Handle different possible response formats
            if (typeof configData === 'string') {
                configData = JSON.parse(configData);
            }
            if (typeof sessionData === 'string') {
                sessionData = JSON.parse(sessionData);
            }

            // Extract data with fallbacks
            currentMap = configData?.current_map || configData?.map || sessionData?.current_map || 'Unknown Map';
            timeRemaining = sessionData?.time_remaining || sessionData?.remaining_time || 'Unknown';
            alliedScore = sessionData?.allied_score || sessionData?.allies_score || sessionData?.team1_score || 0;
            axisScore = sessionData?.axis_score || sessionData?.germans_score || sessionData?.team2_score || 0;
            maxPlayers = configData?.max_players || configData?.slots || 100;
            currentPlayers = sessionData?.current_players || sessionData?.players_count || sessionData?.nb_players || 0;

            matchContainer.innerHTML = `
                <div class="match-data-grid">
                    <!-- Current Map Card -->
                    <div class="match-data-card map-card">
                        <div class="card-icon">🗺️</div>
                        <div class="card-content">
                            <div class="card-label">Current Map</div>
                            <div class="card-value">${this.formatMapName(currentMap)}</div>
                        </div>
                    </div>

                    <!-- Time Remaining Card -->
                    <div class="match-data-card time-card">
                        <div class="card-icon">⏰</div>
                        <div class="card-content">
                            <div class="card-label">Time Remaining</div>
                            <div class="card-value">${this.formatTimeRemaining(timeRemaining)}</div>
                        </div>
                    </div>

                    <!-- Score Card -->
                    <div class="match-data-card score-card">
                        <div class="card-icon">📊</div>
                        <div class="card-content">
                            <div class="card-label">Score</div>
                            <div class="card-value">
                                <span class="allied-score">${alliedScore}</span>
                                <span class="score-separator">-</span>
                                <span class="axis-score">${axisScore}</span>
                            </div>
                            <div class="score-labels">
                                <span class="allied-label">Allies</span>
                                <span class="axis-label">Axis</span>
                            </div>
                        </div>
                    </div>

                    <!-- Players Card -->
                    <div class="match-data-card players-card-data">
                        <div class="card-icon">👥</div>
                        <div class="card-content">
                            <div class="card-label">Players</div>
                            <div class="card-value">${currentPlayers}/${maxPlayers}</div>
                            <div class="players-progress">
                                <div class="progress-bar" style="width: ${Math.min((currentPlayers / maxPlayers) * 100, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering match data:', error);
            matchContainer.innerHTML = '<div class="error-message">Error displaying match data</div>';
        }
    }

    // Helper method to format map names
    static formatMapName(mapId) {
        if (!mapId || mapId === 'Unknown Map') return mapId;

        // Convert map ID to readable name
        return mapId
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/Warfare/gi, 'Warfare')
            .replace(/Offensive/gi, 'Offensive')
            .replace(/Skirmish/gi, 'Skirmish');
    }

    // Helper method to format time remaining
    static formatTimeRemaining(timeData) {
        if (!timeData || timeData === 'Unknown') return 'Unknown';

        // Handle different time formats
        if (typeof timeData === 'number') {
            // Assume seconds
            const totalMinutes = Math.floor(timeData / 60);
            const seconds = timeData % 60;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        if (typeof timeData === 'string') {
            // Return as-is if it's already formatted
            return timeData;
        }

        return 'Unknown';
    }

    // Enhanced refresh function for both match data and players
    static async refreshLiveView() {
        await Promise.all([
            this.loadMatchData(),
            this.loadPlayers()
        ]);
    }

    // Initialize players component
    static init() {
        // Set Commands as the default active menu button
        this.setActiveMenuButton('commandsMenuBtn');
        console.log('Players component initialized');
    }
}

// Export global functions for HTML onclick handlers
window.showPlayersPage = () => PlayersComponent.renderPlayersPage();
window.refreshPlayers = () => PlayersComponent.loadPlayers();
window.refreshLiveView = () => PlayersComponent.refreshLiveView();
window.togglePlayerDetails = (rowId) => PlayersComponent.togglePlayerDetails(rowId);
window.messagePlayer = (playerId, playerName) => PlayersComponent.messagePlayer(playerId, playerName);
window.kickPlayer = (playerId, playerName) => PlayersComponent.kickPlayer(playerId, playerName);
window.punishPlayer = (playerId, playerName) => PlayersComponent.punishPlayer(playerId, playerName);
window.switchPlayerTeam = (playerId, playerName) => PlayersComponent.switchPlayerTeam(playerId, playerName);
