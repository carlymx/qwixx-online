// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const App = {
  socket: null,
  userId: null,
  username: null,
  tableId: null,
  chatLobby: null,
  chatGame: null,
  _pageFocused: true,
  _notifPerm: 'default',

  init() {
    this.socket = io();
    this.setupSocketEvents();
    Theme.init();
    GameUI.loadSVGTemplate();

    document.addEventListener('visibilitychange', () => {
      this._pageFocused = !document.hidden;
    });
    window.addEventListener('blur', () => { this._pageFocused = false; });
    window.addEventListener('focus', () => { this._pageFocused = true; });

    if ('Notification' in window && Notification.permission === 'default') {
      document.addEventListener('click', () => Notification.requestPermission().then(p => { this._notifPerm = p; }), { once: true });
    }

    const saved = Storage.get('username');
    if (saved) {
      document.getElementById('login-name').value = saved;
    }

    document.getElementById('btn-login').addEventListener('click', () => this.login());
    document.getElementById('login-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.login();
    });
    document.getElementById('btn-help')?.addEventListener('click', () => {
      window.open('/docs/', '_blank');
    });
    document.getElementById('btn-help-game')?.addEventListener('click', () => {
      window.open('/docs/', '_blank');
    });
    document.getElementById('btn-create-table')?.addEventListener('click', () => {
      Lobby.showCreateTableModal();
    });
    document.getElementById('btn-create-table-confirm')?.addEventListener('click', () => {
      Lobby.createTable();
    });
    document.getElementById('btn-create-table-cancel')?.addEventListener('click', () => {
      Lobby.hideCreateTableModal();
    });
    document.getElementById('btn-leave-game')?.addEventListener('click', () => this.showLeaveConfirm());

    document.getElementById('btn-refresh-rankings')?.addEventListener('click', () => {
      this.socket.emit('get_rankings');
    });

    this.chatLobby = createChat('lobby-chat-messages', 'lobby-chat-input', 'lobby-chat-send');
    this.chatGame = createChat('game-chat-messages', 'game-chat-input', 'game-chat-send');

    this.startClock();
    this.showView('login');
  },

  startClock() {
    function update() {
      const now = new Date();
      const s = now.toTimeString().slice(0, 8);
      const els = document.querySelectorAll('.clock');
      for (const el of els) el.textContent = s;
    }
    update();
    setInterval(update, 1000);
  },

  login() {
    const name = document.getElementById('login-name').value.trim();
    if (name.length < 2) {
      document.getElementById('login-error').textContent = t('login.error.short');
      return;
    }
    Storage.set('username', name);
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = '⏳';
    document.getElementById('login-error').textContent = '';
    this._loginAttempt = { name, attempt: 0 };
    setTimeout(() => this.socket.emit('set_username', { name }), 500);
  },

  showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.add('active');
  },

  showTableLobby(tableState) {
    App._lastTableState = tableState;
    const board = document.getElementById('my-board');
    const diceArea = document.getElementById('dice-area');
    const othersBoards = document.getElementById('others-boards');
    if (!board) return;

    const isHost = tableState.hostId === this.userId;
    const players = tableState.players || [];

    board.innerHTML = `
      <div class="board-title">${t('tableLobby.table', { name: tableState.name })}</div>
      <div class="card" style="padding:var(--spacing-lg);text-align:center;">
        <p style="margin-bottom:var(--spacing-md);font-size:var(--font-size-lg);">${t('tableLobby.waiting')}</p>
        <div id="table-lobby-players" class="flex flex-col gap-sm" style="margin-bottom:var(--spacing-lg);">
          ${players.map(p => `
            <div class="player-chip" style="justify-content:center;">
              <span class="indicator"></span>
              ${Chat.escape(p.username)}${p.id === tableState.hostId ? ' 👑' : ''}
            </div>
          `).join('')}
        </div>
        ${isHost ? `<button id="btn-start-game" class="btn btn-success" style="font-size:var(--font-size-lg);padding:12px 32px;">${t('tableLobby.startGame')}</button>` : `<p class="text-muted espera-anfitrion">${t('tableLobby.waitingHost')}</p>`}
        <p class="text-muted" style="margin-top:var(--spacing-sm);font-size:var(--font-size-sm);">${t('tableLobby.minPlayers')}</p>
      </div>
    `;

    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.socket.emit('start_game');
    });

    if (diceArea) diceArea.innerHTML = `<div class="text-muted">${t('tableLobby.notStarted')}</div>`;
    if (othersBoards) othersBoards.innerHTML = '';
    document.getElementById('scores-body').innerHTML = '';
  },

  renderTableLobbyPlayers(players, hostId) {
    let container = document.getElementById('table-lobby-players');
    if (!container) return;
    const isHost = hostId === this.userId;
    container.innerHTML = players.map(p => `
      <div class="player-chip" style="justify-content:center;">
        <span class="indicator"></span>
        ${Chat.escape(p.username)}${p.id === hostId ? ' 👑' : ''}
      </div>
    `).join('');
    // Re-grab container ref in case innerHTML replaced it
    container = document.getElementById('table-lobby-players');
    if (!container) return;
    const parent = container.parentElement;
    // Remove existing start button and wait message
    document.getElementById('btn-start-game')?.remove();
    const oldMsg = parent.querySelector('.espera-anfitrion');
    if (oldMsg) oldMsg.remove();
    // Add button or wait message
    if (isHost) {
      const btn = document.createElement('button');
      btn.id = 'btn-start-game';
      btn.className = 'btn btn-success';
      btn.style.cssText = 'font-size:var(--font-size-lg);padding:12px 32px;margin-top:8px;';
      btn.textContent = t('tableLobby.startGame');
      btn.addEventListener('click', () => this.socket.emit('start_game'));
      parent.appendChild(btn);
    } else {
      const msg = document.createElement('p');
      msg.className = 'text-muted espera-anfitrion';
      msg.style.cssText = 'margin-top:8px;';
      msg.textContent = t('tableLobby.waitingHost');
      parent.appendChild(msg);
    }
  },

  showLeaveConfirm() {
    const existing = document.querySelector('.modal-overlay.leave-confirm');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active leave-confirm';
    modal.innerHTML = `
      <div class="modal-content" style="text-align:center;">
        <h2>${t('leave.title')}</h2>
        <p style="margin-bottom:var(--spacing-lg);color:var(--text-secondary);">${t('leave.message')}</p>
        <div class="btn-row" style="justify-content:center;">
          <button class="btn btn-secondary" id="btn-leave-cancel">${t('leave.cancel')}</button>
          <button class="btn btn-danger" id="btn-leave-confirm">${t('leave.confirm')}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById('btn-leave-cancel')?.addEventListener('click', () => modal.remove());
    document.getElementById('btn-leave-confirm')?.addEventListener('click', () => {
      modal.remove();
      this.leaveGame();
    });
  },

  leaveGame() {
    if (this.tableId) {
      this.socket.emit('leave_table');
    }
  },

  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Conectado al servidor');
    });

    this.socket.on('login_success', (data) => {
      this._loginAttempt = null;
      const btn = document.getElementById('btn-login');
      if (btn) { btn.disabled = false; btn.textContent = t('login.button'); }
      this.userId = data.id;
      this.username = data.username;
      document.getElementById('lobby-username').textContent = data.username;
      this.showView('lobby');
      this.socket.emit('get_rankings');
      Lobby.startStatsPolling();
    });

    this.socket.on('error', (data) => {
      const loginError = document.getElementById('login-error');
      if (this._loginAttempt && data._key === 'login.error.taken') {
        if (this._loginAttempt.attempt < 1) {
          this._loginAttempt.attempt++;
          setTimeout(() => this.socket.emit('set_username', { name: this._loginAttempt.name }), 2500);
          return;
        }
        this._loginAttempt = null;
        const btn = document.getElementById('btn-login');
        if (btn) { btn.disabled = false; btn.textContent = t('login.button'); }
      }
      const msg = data._key ? t(data._key, data._vars || {}) : data.message;
      if (loginError) loginError.textContent = msg;
      Audio.playError();
    });

    this.socket.on('players_update', (data) => {
      Lobby.renderPlayers(data.players);
    });

    this.socket.on('tables_update', (data) => {
      Lobby.renderTables(data.tables);
    });

    this.socket.on('rankings', (data) => {
      Lobby.renderRankings(data.rankings);
    });

    this.socket.on('chat_message', (data) => {
      if (this.tableId) {
        this.chatGame.addMessage(data);
      } else {
        this.chatLobby.addMessage(data);
      }
    });

    this.socket.on('table_joined', (data) => {
      this.tableId = data.tableState.id;
      document.getElementById('game-table-name').textContent = data.tableState.name;
      this.showTableLobby(data.tableState);
      this.showView('game');
      Lobby.stopStatsPolling();
    });

    this.socket.on('table_left', () => {
      this.tableId = null;
      document.getElementById('game-over-modal')?.remove();
      this.showView('lobby');
      this.socket.emit('get_rankings');
      Lobby.startStatsPolling();
    });

    this.socket.on('table_players_update', (data) => {
      this.renderTableLobbyPlayers(data.players, data.hostId);
    });

    this.socket.on('game_started', (data) => {
      GameUI.initGame(data.gameState);
      this.chatGame.addMessage({
        username: 'Sistema',
        _key: 'chat.gameStarted',
        timestamp: Date.now(),
        system: true
      });
    });

    this.socket.on('turn_change', (data) => {
      if (GameUI.players) {
        GameUI.players.forEach(p => {
          p.isActive = (p.id === data.playerId);
        });
      }
      if (GameUI.gameState) {
        GameUI.gameState.phase = 'rolling';
      }
      GameUI.actionPending = false;
      GameUI.action1Marked = false;
      GameUI.renderDice();
      GameUI.renderScores();
      // Status
      if (GameUI.myPlayerId === data.playerId) {
        GameUI.updateStatus(t('game.status.yourTurn'));
      } else {
        GameUI.updateStatus(t('game.status.waitingTurn', { name: data.username }));
      }
      this.chatGame.addMessage({
        username: 'Sistema',
        _key: 'chat.turnOf',
        _vars: { username: data.username },
        timestamp: Date.now(),
        system: true
      });
    });

    this.socket.on('dice_rolled', (data) => {
      if (GameUI.gameState) {
        GameUI.gameState.dice = data.dice;
        GameUI.gameState.phase = 'action1';
      }
      GameUI.renderDice();
      Audio.playDiceRoll();
      GameUI.showAction1Prompt(data.sum, data.action1Timeout);
      GameUI.updateStatus(t('game.status.diceRolled', { sum: data.sum }));
      if (data.action1Timeout) GameUI.startTimer('action1-timer', data.action1Timeout);
    });

    this.socket.on('action_2_prompt', (data) => {
      if (GameUI.gameState) GameUI.gameState.phase = 'action2';
      GameUI.actionPending = false;
      GameUI.renderAll();
      const me = GameUI.players && GameUI.players.find(p => p.id === GameUI.myPlayerId);
      const activeP = GameUI.players && GameUI.players.find(p => p.isActive);
      if (me && me.isActive) {
        GameUI.updateStatus(t('game.status.chooseCombo'));
      } else if (activeP) {
        GameUI.updateStatus(t('game.status.waitingAction2', { name: activeP.username }));
      }
      GameUI.showAction2Prompt(data);
    });

    this.socket.on('player_updated', (data) => {
      Audio.playMark();
      const player = GameUI.players.find(p => p.id === data.playerId);
      if (player) {
        player.filas = data.filas;
        player.penalties = data.penalties;
      }
      GameUI.renderAll();
      // If we're in action1 and still pending, show waiting status
      if (GameUI.gameState && GameUI.gameState.phase === 'action1' && GameUI.actionPending) {
        const activeP = GameUI.players.find(p => p.isActive);
        if (activeP && activeP.id !== GameUI.myPlayerId) {
          GameUI.updateStatus(t('game.status.waitingPlayer', { name: activeP.username }));
        }
      }
    });

    this.socket.on('row_locked', (data) => {
      Audio.playLock();
      if (GameUI.gameState) {
        if (!GameUI.gameState.lockedRows.includes(data.color)) {
          GameUI.gameState.lockedRows.push(data.color);
        }
      }
      if (GameUI.players) {
        GameUI.players.forEach(p => {
          if (p.filas && p.filas[data.color]) {
            p.filas[data.color].locked = true;
          }
        });
      }
      GameUI.actionPending = false;
      GameUI.renderAll();
      this.chatGame.addMessage({
        username: 'Sistema',
        _key: 'chat.rowLocked',
        _vars: { color: '$color.' + data.color + '.f' },
        timestamp: Date.now(),
        system: true
      });
    });

    this.socket.on('game_over', (data) => {
      GameUI.updateStatus(t('game.status.gameOver'));
      GameUI.showGameOver(data.results);
    });
  }
};

document.addEventListener('langchanged', () => {
  Lobby.renderPlayers(Lobby.players);
  Lobby.renderTables(Lobby.tables);
  if (Lobby._lastRankings) Lobby.renderRankings(Lobby._lastRankings);
  if (Lobby._lastStats) Lobby.renderStats(Lobby._lastStats);
  if (GameUI.players && GameUI.players.length > 0) GameUI.renderAll();
  if (App._lastTableState && (!GameUI.players || GameUI.players.length === 0)) {
    App.showTableLobby(App._lastTableState);
  }
});

document.addEventListener('DOMContentLoaded', () => App.init());
