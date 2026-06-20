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
      container.innerHTML = '<div class="text-muted">No hay mesas activas. ¡Crea una!</div>';
      return;
    }
    container.innerHTML = tables.map(t => `
      <div class="table-card">
        <div class="info">
          <div class="table-name">${Chat.escape(t.name)}</div>
          <div class="table-meta">${t.playerCount}/${t.maxPlayers} jugadores · Creada por ${Chat.escape(t.hostName)}</div>
        </div>
        <div class="flex items-center gap-sm">
          ${t.hasPassword ? '<span class="lock-icon" title="Mesa protegida">🔒</span>' : ''}
          <span class="status-badge ${t.status}">${t.status === 'waiting' ? 'Esperando' : 'Jugando'}</span>
          ${t.status === 'waiting' && t.playerCount < 5
            ? `<button class="btn btn-primary btn-join" data-table-id="${t.id}" ${t.hasPassword ? 'data-has-password="1"' : ''}>Unirse</button>`
            : ''}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-join').forEach(btn => {
      btn.addEventListener('click', () => {
        const tableId = btn.dataset.tableId;
        if (btn.dataset.hasPassword) {
          const password = window.prompt('Esta mesa requiere contraseña:');
          if (password === null) return;
          App.socket.emit('join_table', { tableId, password });
        } else {
          App.socket.emit('join_table', { tableId });
        }
      });
    });
  },

  renderRankings(rankings) {
    const container = document.getElementById('rankings-list');
    if (!container) return;
    if (!rankings || rankings.length === 0) {
      container.innerHTML = '<div class="text-muted">Aún no hay rankings</div>';
      return;
    }
    container.innerHTML = rankings.map((r, i) => `
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
    App.socket.emit('create_table', { name, password });
    this.hideCreateTableModal();
  }
};
