// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const Lobby = {
  players: [],
  tables: [],

  renderPlayers(players) {
    this.players = players;
    const container = document.getElementById('players-list');
    if (!container) return;
    container.innerHTML = players.map(p => `
      <div class="player-chip">
        <span class="indicator ${p.inTable ? 'in-game' : ''}"></span>
        ${Chat.escape(p.username)}
      </div>
    `).join('');
    const count = document.getElementById('players-count');
    if (count) count.textContent = `(${players.length})`;
  },

  renderTables(tables) {
    this.tables = tables;
    const container = document.getElementById('tables-list');
    if (!container) return;
    if (tables.length === 0) {
      container.innerHTML = `<div class="text-muted">${t('lobby.noTables')}</div>`;
      return;
    }
    container.innerHTML = tables.map(tbl => `
      <div class="table-card">
        <div class="info">
          <div class="table-name">${Chat.escape(tbl.name)}</div>
          <div class="table-meta">${t('table.meta', { count: tbl.playerCount, max: tbl.maxPlayers, host: tbl.hostName })}</div>
        </div>
        <div class="flex items-center gap-sm">
          ${tbl.hasPassword ? `<span class="lock-icon" title="${t('table.passwordProtected')}">🔒</span>` : ''}
          ${tbl.status === 'playing'
            ? `<span class="status-badge playing">${t('table.playing')}</span>`
            : tbl.playerCount >= tbl.maxPlayers
              ? `<span class="status-badge full">${t('table.full')}</span>`
              : `<span class="status-badge waiting">${t('table.waiting')}</span>`}
          ${tbl.status === 'waiting' && tbl.playerCount < tbl.maxPlayers
            ? `<button class="btn btn-primary btn-join" data-table-id="${tbl.id}" ${tbl.hasPassword ? 'data-has-password="1"' : ''}>${t('table.join')}</button>`
            : tbl.status === 'waiting' && tbl.playerCount >= tbl.maxPlayers
              ? `<button class="btn btn-join disabled" disabled>${t('table.join')}</button>`
              : ''}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-join').forEach(btn => {
      btn.addEventListener('click', () => {
        const tableId = btn.dataset.tableId;
        if (btn.dataset.hasPassword) {
          const password = window.prompt(t('table.passwordPrompt'));
          if (password === null) return;
          App.socket.emit('join_table', { tableId, password });
        } else {
          App.socket.emit('join_table', { tableId });
        }
      });
    });
  },

  renderRankings(rankings) {
    Lobby._lastRankings = rankings;
    const container = document.getElementById('rankings-list');
    if (!container) return;
    if (!rankings || rankings.length === 0) {
      container.innerHTML = `<div class="text-muted">${t('lobby.noRankings')}</div>`;
      return;
    }
    container.innerHTML = `
      <li class="ranking-header">
        <span class="rank"></span>
        <span class="name">${t('rankings.name')}</span>
        <span class="score">${t('rankings.score')}</span>
        <span class="stats">${t('rankings.stats')}</span>
      </li>
    ` + rankings.map((r, i) => `
      <li class="ranking-entry ${i < 3 ? 'top-' + (i+1) : ''}">
        <span class="rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
        <span class="name">${Chat.escape(r.username)}</span>
        <span class="score">${r.score}</span>
        <span class="stats">${r.wins || 0}/${r.games || 0}</span>
      </li>
    `).join('');
  },

  showCreateTableModal() {
    const modal = document.getElementById('modal-create-table');
    if (!modal) return;
    modal.classList.add('active');
    document.getElementById('create-table-name').value = '';
    document.getElementById('create-table-password').value = '';
  },

  hideCreateTableModal() {
    document.getElementById('modal-create-table')?.classList.remove('active');
  },

  createTable() {
    const nameInput = document.getElementById('create-table-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const passInput = document.getElementById('create-table-password');
    const password = passInput ? passInput.value : '';
    const maxInput = document.getElementById('create-table-max-players');
    const maxPlayers = maxInput ? parseInt(maxInput.value) || 5 : 5;
    App.socket.emit('create_table', { name, password, maxPlayers });
    this.hideCreateTableModal();
  },

  async fetchStats() {
    try {
      const res = await fetch('/api/stats');
      const stats = await res.json();
      this.renderStats(stats);
    } catch (e) {
      // ignore
    }
  },

  renderStats(stats) {
    Lobby._lastStats = stats;
    const container = document.getElementById('server-stats-content');
    if (!container) return;
    const dbIndicator = stats.isConnected ? '🟢' : '🔴';
    const lastRestart = new Date(stats.lastRestart);
    const now = new Date();
    const diff = Math.floor((now - lastRestart) / 1000);
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);

    container.innerHTML = `
      <span class="stats-db-indicator">${dbIndicator}</span>
      <span class="stats-version">v0.9.5</span>
      <span class="stats-sep">·</span>
      <span>🟢</span> <span class="stats-label">${t('stats.connections')}</span> <span class="stats-value">${stats.currentConnections}</span> <span class="stats-muted">${t('stats.peak', { n: stats.peakConnections })}</span>
      <span class="stats-sep">·</span>
      <span>🔢</span> <span class="stats-label">${t('stats.totalConnections')}</span> <span class="stats-value">${stats.totalConnections}</span>
      <span class="stats-sep">·</span>
      <span>🎲</span> <span class="stats-label">${t('stats.gamesPlayed')}</span> <span class="stats-value">${stats.totalGamesPlayed}</span>
      <span class="stats-sep">·</span>
      <span>🕐</span> <span class="stats-label">${t('stats.lastRestart')}</span> <span class="stats-value">${days > 0 ? `${days}d ` : ''}${hours}h ${mins}m</span>
    `;
  },

  startStatsPolling() {
    this.fetchStats();
    this._statsInterval = setInterval(() => this.fetchStats(), 30000);
  },

  stopStatsPolling() {
    if (this._statsInterval) {
      clearInterval(this._statsInterval);
      this._statsInterval = null;
    }
  }
};
