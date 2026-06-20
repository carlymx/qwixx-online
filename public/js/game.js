// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const GameUI = {
  myPlayerId: null,
  players: [],
  gameState: null,
  actionPending: false,
  action1Marked: false,
  svgTemplate: null,

  initGame(gameState) {
    this.myPlayerId = App.userId;
    this.players = gameState.players;
    this.gameState = gameState;
    this.actionPending = false;
    this.action1Marked = false;
    this.renderAll();
  },

  loadSVGTemplate() {
    if (this.svgTemplate) return;
    fetch('/carton.svg')
      .then(r => r.text())
      .then(text => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        this.svgTemplate = doc.querySelector('svg');
        if (this.players.length > 0) this.renderAll();
      })
      .catch(() => {});
  },

  renderAll() {
    const me = this.players.find(p => p.id === this.myPlayerId);
    if (me) this.renderMyBoard(me);
    this.renderOtherBoards();
    this.renderScores();
    this.renderDice();
  },

  renderMyBoard(player) {
    const board = document.getElementById('my-board');
    if (!board) return;
    const rows = ['red', 'yellow', 'green', 'blue'];
    const game = this.gameState;
    const sum = game && game.dice ? (game.dice.white[0] + game.dice.white[1]) : 0;

    if (!this.svgTemplate) {
      board.innerHTML = `<div class="board-title">Tu cartón — ${Chat.escape(player.username)}</div><div class="text-muted" style="text-align:center;padding:20px;">Cargando cartón...</div>`;
      return;
    }

    board.innerHTML = `<div class="board-title">Tu cartón — ${Chat.escape(player.username)}</div>`;

    const svg = this.svgTemplate.cloneNode(true);
    svg.classList.add('board-svg');

    for (const color of rows) {
      const fila = player.filas[color];
      const isAsc = (color === 'red' || color === 'yellow');
      const values = isAsc ? [2,3,4,5,6,7,8,9,10,11,12] : [12,11,10,9,8,7,6,5,4,3,2];

      const unlockGroup = this._svgEl(svg, `unlock_${color}`);
      const lockGroup = this._svgEl(svg, `lock_${color}`);
      if (unlockGroup) {
        if (fila.locked) {
          unlockGroup.style.display = 'none';
        } else {
          unlockGroup.removeAttribute('style');
        }
      }
      if (lockGroup) {
        if (fila.locked) {
          lockGroup.removeAttribute('style');
        } else {
          lockGroup.style.display = 'none';
        }
      }

      const blockPanel = this._svgEl(svg, `block_panel_${color}`);
      if (blockPanel) {
        blockPanel.style.display = fila.locked ? 'none' : '';
      }

      let lastMarkedIdx = -1;
      for (let i = 0; i < 11; i++) {
        if (fila.marked[i]) lastMarkedIdx = i;
      }

      for (let i = 0; i < 11; i++) {
        const val = values[i];
        const panelEl = this._svgEl(svg, `panel_${color}_${val}`);
        const numEl = this._svgEl(svg, `numeros_${color}_${val}`);
        if (!panelEl || !numEl) continue;

        if (fila.marked[i]) {
          panelEl.setAttribute('fill', this._markedFill(color));
          numEl.setAttribute('fill', '#ffffff');
        } else if (fila.locked) {
          panelEl.classList.add('panel-locked');
        } else if (i < lastMarkedIdx) {
          panelEl.classList.add('panel-disabled');
        }

        const canSelect = this.actionPending &&
          !fila.marked[i] && !fila.locked &&
          val === sum && i > lastMarkedIdx &&
          !(i === 10 && fila.count < 5);

        if (canSelect) {
          panelEl.classList.add('panel-selectable');
          numEl.classList.add('panel-selectable');
          const clickHandler = () => {
            Audio.playMark();
            App.socket.emit('action_1_choice', { color });
            GameUI.actionPending = false;
            GameUI.action1Marked = true;
            const p = GameUI.players.find(p => p.id === GameUI.myPlayerId);
            if (p && p.filas && p.filas[color]) {
              p.filas[color].marked[i] = true;
              p.filas[color].count = p.filas[color].marked.filter(Boolean).length;
            }
            GameUI.renderMyBoard(GameUI.players.find(p => p.id === GameUI.myPlayerId));
            const activeP = GameUI.players.find(p => p.isActive);
            if (activeP && activeP.id !== GameUI.myPlayerId) {
              GameUI.updateStatus(`⏳ Esperando a ${activeP.username} en la Acción 1...`);
            } else {
              GameUI.updateStatus('⏳ Esperando a los demás jugadores en la Acción 1...');
            }
          };
          panelEl.addEventListener('click', clickHandler);
          numEl.addEventListener('click', clickHandler);
        }
      }
    }

    board.appendChild(svg);

    // Add X marks on marked cells (using viewport coordinates for reliability)
    const svgRect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scaleX = vb.width / svgRect.width;
    const scaleY = vb.height / svgRect.height;
    const ns = 'http://www.w3.org/2000/svg';
    for (const color of rows) {
      const fila = player.filas[color];
      const isAsc = (color === 'red' || color === 'yellow');
      const values = isAsc ? [2,3,4,5,6,7,8,9,10,11,12] : [12,11,10,9,8,7,6,5,4,3,2];
      for (let i = 0; i < 11; i++) {
        if (!fila.marked[i]) continue;
        const val = values[i];
        const panelEl = this._svgEl(svg, `panel_${color}_${val}`);
        if (!panelEl) continue;
        const pr = panelEl.getBoundingClientRect();
        const cx = (pr.left + pr.width / 2 - svgRect.left) * scaleX;
        const cy = (pr.top + pr.height / 2 - svgRect.top) * scaleY;
        const size = Math.min(pr.width, pr.height) * 0.35 * scaleX;
        const g = document.createElementNS(ns, 'g');
        g.setAttribute('stroke', '#000');
        g.setAttribute('stroke-width', String(Math.max(2, Math.round(size * 0.4))));
        g.setAttribute('stroke-linecap', 'round');
        const l1 = document.createElementNS(ns, 'line');
        l1.setAttribute('x1', cx - size);
        l1.setAttribute('y1', cy - size);
        l1.setAttribute('x2', cx + size);
        l1.setAttribute('y2', cy + size);
        g.appendChild(l1);
        const l2 = document.createElementNS(ns, 'line');
        l2.setAttribute('x1', cx - size);
        l2.setAttribute('y1', cy + size);
        l2.setAttribute('x2', cx + size);
        l2.setAttribute('y2', cy - size);
        g.appendChild(l2);
        svg.appendChild(g);
      }
    }

    const penDiv = document.createElement('div');
    penDiv.className = 'penalties';
    for (let i = 0; i < 4; i++) {
      const p = document.createElement('div');
      p.className = `penalty-box${i < player.penalties ? ' filled' : ''}`;
      penDiv.appendChild(p);
    }
    board.appendChild(penDiv);

    if (this.actionPending) {
      const skipBtn = document.createElement('div');
      skipBtn.style.cssText = 'text-align:center;margin-top:8px;';
      skipBtn.innerHTML = `<button class="btn btn-danger" id="btn-skip-action1">Pasar (no tachar nada)</button>`;
      board.appendChild(skipBtn);
      setTimeout(() => {
        document.getElementById('btn-skip-action1')?.addEventListener('click', () => {
          App.socket.emit('action_1_choice', { color: null });
          GameUI.actionPending = false;
          GameUI.renderAll();
          const activeP = GameUI.players.find(p => p.isActive);
          if (activeP && activeP.id !== GameUI.myPlayerId) {
            GameUI.updateStatus(`⏳ Esperando a ${activeP.username} en la Acción 1...`);
          } else {
            GameUI.updateStatus('⏳ Esperando a los demás jugadores en la Acción 1...');
          }
        });
      }, 0);
    }
  },

  _svgEl(svg, label) {
    const ns = 'http://www.inkscape.org/namespaces/inkscape';
    const all = svg.querySelectorAll('*');
    for (const el of all) {
      if (el.getAttributeNS(ns, 'label') === label) return el;
    }
    return null;
  },

  _markedFill(color) {
    return { red: '#e00000', yellow: '#fdca00', green: '#339900', blue: '#336699' }[color];
  },

  updateStatus(msg) {
    const el = document.getElementById('game-status');
    if (el) el.textContent = msg;
  },

  renderOtherBoards() {
    const container = document.getElementById('others-boards');
    if (!container) return;
    container.innerHTML = '';
    const others = this.players.filter(p => p.id !== this.myPlayerId);

    for (const p of others) {
      const el = document.createElement('div');
      el.className = 'mini-board';
      el.innerHTML = `
        <div class="mini-name">${Chat.escape(p.username)}</div>
        <div class="mini-rows">
          ${['red','yellow','green','blue'].map(c => {
            const fila = p.filas[c];
            if (!fila) return '';
            const pct = Math.min((fila.count / 12) * 100, 100);
            return `<div class="mini-row">
              <span class="mini-label">${c === 'red' ? '🔴' : c === 'yellow' ? '🟡' : c === 'green' ? '🟢' : '🔵'}</span>
              <div class="mini-bar ${c}" style="width:${pct}%"></div>
            </div>`;
          }).join('')}
        </div>
        <div class="mini-stats">
          <span>Penalizaciones: ${'⬜'.repeat(p.penalties)}${'⬛'.repeat(4 - p.penalties)}</span>
        </div>
      `;
      container.appendChild(el);
    }
  },

  renderScores() {
    const container = document.getElementById('scores-body');
    if (!container) return;

    container.innerHTML = this.players.map(p => {
      const isActive = p.isActive && this.gameState && this.gameState.phase !== 'gameover';
      const isSelf = p.id === this.myPlayerId;
      return `<tr class="${isActive ? 'is-active' : ''} ${isSelf ? 'is-self' : ''}">
        <td>${Chat.escape(p.username)}${isActive ? ' 🎯' : ''}</td>
        <td class="penalty-cell">${p.penalties > 0 ? `-${p.penalties * 5}` : '—'}</td>
        <td class="score-val">${gameLogicUtils.getTotalScore(p)}</td>
      </tr>`;
    }).join('');
  },

  renderDice() {
    const container = document.getElementById('dice-area');
    if (!container) return;
    const game = this.gameState;
    if (!game || !game.dice) return;

    const dice = game.dice;
    const me = this.players.find(p => p.id === this.myPlayerId);
    const isMyTurn = me && me.isActive;
    const isRolling = game.phase === 'rolling';
    const isAction2 = game.phase === 'action2';
    const isAction1 = game.phase === 'action1';

    // Determine active player name
    const activeP = this.players.find(p => p.isActive);

    let html = '';
    if (activeP) {
      html += `<div class="turn-info">Turno de: <strong>${Chat.escape(activeP.username)}</strong></div>`;
    }

    if (dice.white[0] > 0) {
      // Colored dice
      html += '<div class="dice-container dice-colors">';
      const colors = ['red', 'yellow', 'green', 'blue'];
      for (const c of colors) {
        if (dice[c] !== null) {
          const isLocked = game.lockedRows.includes(c);
          html += `<div class="dice ${c}-dice animating${isLocked ? ' inactive' : ''}"><span class="dice-dots">${this.dieFace(dice[c])}</span></div>`;
        }
      }
      html += '</div>';

      // White dice
      html += '<div class="dice-container dice-whites">';
      html += dice.white.map(v => `<div class="dice white-dice animating"><span class="dice-dots">${this.dieFace(v)}</span></div>`).join('');
      html += '</div>';

      // Timer
      if (isAction1) {
        html += '<div class="timer" id="action1-timer"></div>';
      }

      // Roll button
      if (isMyTurn && isRolling) {
        html += `<div class="roll-area"><button class="btn-roll" id="btn-roll">🎲 Tirar Dados</button></div>`;
      }
    } else {
      if (isMyTurn && isRolling) {
        html += `<div class="turn-info">Es tu turno</div>`;
        html += `<div class="roll-area"><button class="btn-roll" id="btn-roll">🎲 Tirar Dados</button></div>`;
      } else {
        html += `<div class="text-muted">Esperando tirada...</div>`;
      }
    }

    container.innerHTML = html;
    document.getElementById('btn-roll')?.addEventListener('click', () => {
      Audio.playDiceRoll();
      App.socket.emit('roll_dice');
    });
  },

  showAction2Prompt(data) {
    const container = document.getElementById('dice-area');
    if (!container) return;
    const me = this.players.find(p => p.id === this.myPlayerId);
    if (!me || !me.isActive) return;

    const rows = ['red', 'yellow', 'green', 'blue'];
    const rowValues = {
      red: [2,3,4,5,6,7,8,9,10,11,12],
      yellow: [2,3,4,5,6,7,8,9,10,11,12],
      green: [12,11,10,9,8,7,6,5,4,3,2],
      blue: [12,11,10,9,8,7,6,5,4,3,2]
    };

    function canMarkColor(color, sum) {
      const fila = me.filas[color];
      if (!fila || fila.locked) return false;
      const values = rowValues[color];
      const numIdx = values.indexOf(sum);
      if (numIdx === -1) return false;
      if (numIdx === 10) {
        let count = 0;
        for (let i = 0; i < 11; i++) {
          if (fila.marked[i]) count++;
        }
        if (count < 5) return false;
      }
      let lastIdx = -1;
      for (let i = 0; i < 11; i++) {
        if (fila.marked[i]) lastIdx = i;
      }
      return numIdx > lastIdx;
    }

    const warningHtml = !GameUI.action1Marked
      ? `<div class="warning-banner">⚠️ No marcaste ningún número en la Acción 1. Si pasas ahora, recibirás <strong>-5 puntos</strong> de penalización.</div>`
      : '';

    let html = `<div class="action-prompt">
      <h3>Acción 2: Elige una combinación</h3>
      <p>Selecciona un dado base + un dado de color para tachar</p>
      ${warningHtml}
      <div class="action-options">
        ${data.availableColors.map(cd => {
          const base0Sum = data.bases[0] + cd.value;
          const base1Sum = data.bases[1] + cd.value;
          const colorName = { red: 'Rojo', yellow: 'Amarillo', green: 'Verde', blue: 'Azul' }[cd.name];
          const icon = { red: '🔴', yellow: '🟡', green: '🟢', blue: '🔵' }[cd.name];
          const valid0 = canMarkColor(cd.name, base0Sum);
          const valid1 = canMarkColor(cd.name, base1Sum);
          return `
            <button class="action-btn action2-btn${valid0 ? '' : ' disabled'}" data-color="${cd.name}" data-base-idx="0"${valid0 ? '' : ' disabled'}>
              ${icon} ${colorName} ${base0Sum} (${data.bases[0]}+${cd.value})
            </button>
            <button class="action-btn action2-btn${valid1 ? '' : ' disabled'}" data-color="${cd.name}" data-base-idx="1"${valid1 ? '' : ' disabled'}>
              ${icon} ${colorName} ${base1Sum} (${data.bases[1]}+${cd.value})
            </button>
          `;
        }).join('')}
        <button class="action-btn skip" id="btn-skip-action2">No tachar nada</button>
      </div>
      <div class="timer" id="action2-timer"></div>
    </div>`;
    container.innerHTML = html;

    document.querySelectorAll('.action2-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        Audio.playMark();
        App.socket.emit('action_2_choice', {
          baseIdx: parseInt(btn.dataset.baseIdx),
          color: btn.dataset.color
        });
      });
    });
    document.getElementById('btn-skip-action2')?.addEventListener('click', () => {
      App.socket.emit('action_2_choice', { baseIdx: null, color: null });
    });

    if (data.timeout) this.startTimer('action2-timer', data.timeout);
  },

  showAction1Prompt(sum, timeout) {
    this.actionPending = true;
    this.renderAll();
  },

  showGameOver(results) {
    const container = document.getElementById('game-content');
    if (!container) return;

    const existing = document.querySelector('.modal-overlay.game-over');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active game-over';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🏆 ¡Partida Terminada!</h2>
        <ol class="results-list">
          ${results.map((r, i) => `
            <li class="${i === 0 ? 'winner' : ''}">
              <span class="rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span class="name">${Chat.escape(r.username)}</span>
              <span class="score">${r.score} pts</span>
            </li>
          `).join('')}
        </ol>
        <div class="results-details">
          ${results.map(r => `
            <div class="result-player">
              <strong>${Chat.escape(r.username)}</strong>
              <div>🔴 ${r.details.red} 🟡 ${r.details.yellow} 🟢 ${r.details.green} 🔵 ${r.details.blue}</div>
              <div>Penalizaciones: ${r.penalties} (-${r.penalties * 5})</div>
              <div>Total: <strong>${r.score}</strong></div>
            </div>
          `).join('')}
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-return-lobby">Volver al Lobby</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btn-return-lobby')?.addEventListener('click', () => {
      modal.remove();
      App.leaveGame();
    });
    Audio.playGameOver();
  },

  startTimer(elementId, seconds) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let remaining = seconds;
    el.textContent = `⏱ ${remaining}s`;

    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        el.textContent = '⏱ 0s';
        return;
      }
      el.textContent = `⏱ ${remaining}s`;
      el.className = `timer${remaining <= 10 ? ' warning' : ''}`;
    }, 1000);
  },

  dieFace(val) {
    const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return faces[val] || val;
  }
};

// Utility (mirrors server-side gameLogic for client display)
const gameLogicUtils = {
  calculateScore(fila) {
    const n = fila ? fila.count : 0;
    return (n * (n + 1)) / 2;
  },
  getTotalScore(player) {
    const rowScores = Object.values(player.filas).map(this.calculateScore).reduce((a, b) => a + b, 0);
    return rowScores - (player.penalties * 5);
  }
};
