# Qwixx Online — Plan de Implementación

> **Proyecto:** Juego Qwixx multijugador online
> **Versión plan:** 0.8.0
> **Fecha:** 2026-06-20

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend** | HTML5 + CSS3 + Vanilla JS | — | SPA con vistas intercambiables |
| **Backend** | Node.js + Express | ≥18 LTS | Servidor HTTP + API básica |
| **Tiempo real** | Socket.IO | 4.x | WebSockets para juego multijugador |
| **RNG** | `crypto.randomBytes()` (Node.js) | Nativo | CryptoPureSource adaptado al servidor |
| **Persistencia** | JSON file (`data/rankings.json`) | — | Ranking global |
| **Cliente** | `localStorage` | — | Preferencias (nombre, tema) |
| **Sonido** | Web Audio API | Nativo | Tonos sintetizados para dados |

### Justificación de decisiones

- **Vanilla JS sin framework**: El proyecto es una SPA con 3 vistas principales (login, lobby, juego). Un framework como React/Vue añadiría complejidad de build tooling innecesaria para este alcance. Socket.IO gestiona el estado en tiempo real.
- **JSON file como persistencia**: Para un ranking global sin requisitos de consultas complejas, un JSON file es suficiente y evita dependencias de base de datos.
- **Server-side RNG**: El servidor como única fuente de verdad para la aleatoriedad previene manipulaciones del cliente y garantiza公平 para todos los jugadores.

---

## 2. Sistema de Diseño (basado en DESIGN.md)

### 2.1 Tokens de Color

#### Neutros

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--bg-primary` | `#f8f9fa` | `#1a1d21` | Fondo de página |
| `--bg-secondary` | `#ffffff` | `#212529` | Tarjetas, paneles |
| `--bg-tertiary` | `#e9ecef` | `#2d3238` | Headers, inputs |
| `--text-primary` | `#212529` | `#e9ecef` | Títulos, cuerpo |
| `--text-secondary` | `#6c757d` | `#adb5bd` | Labels, secundario |
| `--text-muted` | `#adb5bd` | `#6c757d` | Placeholders |

#### Acento

| Token | Valor | Uso |
|-------|-------|-----|
| `--accent-primary` | `#0d6efd` | Acciones principales, links |
| `--accent-success` | `#198754` | Valores positivos |
| `--accent-danger` | `#dc3545` | Valores negativos |
| `--accent-warning` | `#ffc107` | Advertencias, badges |

#### Qwixx (colores de dados/filas)

| Token | Valor | Uso |
|-------|-------|-----|
| `--dice-red` | `#e74c3c` | Fila/Dado rojo |
| `--dice-yellow` | `#ffc107` | Fila/Dado amarillo |
| `--dice-green` | `#27ae60` | Fila/Dado verde |
| `--dice-blue` | `#0d6efd` | Fila/Dado azul |
| `--dice-white` | `#6c757d` | Dados base (blancos) |

#### Bordes

| Token | Light | Dark |
|-------|-------|------|
| `--border-color` | `#dee2e6` | `#373b3e` |

### 2.2 Tipografía

| Token | Valor |
|-------|-------|
| `--font-family` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| `--font-size-base` | `14px` |
| `--font-size-sm` | `12px` |
| `--font-size-xs` | `11px` |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-bold` | `600` |
| `--font-weight-heading` | `700` |

### 2.3 Espaciado

| Token | Valor | Uso |
|-------|-------|-----|
| `--spacing-xs` | `4px` | Grid gaps |
| `--spacing-sm` | `8px` | Element gaps |
| `--spacing-md` | `12px` | Card padding |
| `--spacing-lg` | `16px` | Section padding |
| `--spacing-xl` | `20px` | Panel padding |
| `--spacing-2xl` | `24px` | Header padding |

### 2.4 Radios y Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `4px` | Inputs, botones |
| `--radius-md` | `8px` | Tarjetas, paneles |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Tarjetas |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Modales |

### 2.5 Motion

| Token | Valor | Uso |
|-------|-------|-----|
| `--transition-fast` | `150ms ease` | Hover states |

### 2.6 Principios de Diseño

1. Claridad sobre lo llamativo — el usuario ve los datos claramente
2. Espaciado consistente — rejilla base de 4px
3. Color funcional — Verde=positivo, Rojo=negativo, Amarillo=advertencia
4. Theme-aware — todos los tokens soportan claro/oscuro
5. Estética de herramienta — no un casino, una mesa de juego limpia

---

## 3. Estructura de Archivos

```
/var/home/carly/Escritorio/qwixx/
├── package.json                    # Dependencias: express, socket.io
├── server.js                       # Servidor Express + Socket.IO
├── game/
│   ├── gameState.js                # Gestión de estado de partidas
│   ├── gameLogic.js                # Motor de reglas Qwixx
│   └── rng.js                      # CryptoPureSource server-side
├── public/
│   ├── index.html                  # SPA principal
│   ├── css/
│   │   └── styles.css              # Todos los estilos
│   ├── js/
│   │   ├── app.js                  # Controlador SPA
│   │   ├── lobby.js                # Vista sala de espera
│   │   ├── game.js                 # Vista de juego
│   │   ├── chat.js                 # Componente chat
│   │   ├── storage.js              # Utilidades localStorage
│   │   ├── theme.js                # Toggle tema
│   │   └── audio.js                # Sonidos Web Audio API
│   └── docs/
│       └── index.html              # Página de ayuda/documentación
└── data/
    └── rankings.json               # Ranking global persistente
```

---

## 4. Arquitectura del Servidor (server.js)

### 4.1 Express Setup

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// API endpoints (rankings)
app.get('/api/rankings', (req, res) => { ... });
app.post('/api/rankings', (req, res) => { ... });
```

### 4.2 Gestión de Conexiones

- Cada conexión Socket.IO tiene un `socket.id` único
- Se mantiene un `Map` de `socketId → { username, inTable, tableId }`
- Al desconectar: eliminar de listas, notificar a salas, abandonar partidas

### 4.3 Salas Socket.IO

- `lobby`: todos los jugadores conectados (broadcast de listas)
- `table:{id}`: sala privada para cada mesa de juego

### 4.4 Eventos Socket.IO

#### Cliente → Servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `set_username` | `{ name: string }` | Registrar nombre de usuario |
| `create_table` | `{ name: string }` | Crear nueva mesa |
| `join_table` | `{ tableId: string }` | Unirse a mesa existente |
| `leave_table` | `{}` | Salir de la mesa actual |
| `invite_player` | `{ tableId, targetId }` | Invitar jugador a mesa |
| `start_game` | `{}` | Iniciar partida (solo host) |
| `roll_dice` | `{}` | Tirar dados (solo turno activo) |
| `action_1_choice` | `{ color: string|null }` | Elección Acción 1 |
| `action_2_choice` | `{ baseIdx: number, color: string }` o `null` | Elección Acción 2 |
| `chat_message` | `{ text: string }` | Enviar mensaje al chat |
| `get_rankings` | `{}` | Solicitar ranking |

#### Servidor → Cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `error` | `{ message: string }` | Error al cliente |
| `login_success` | `{ username }` | Nombre aceptado |
| `players_update` | `{ players: [{id, username, inGame}] }` | Lista de jugadores en lobby |
| `tables_update` | `{ tables: [{id, name, host, players, status}] }` | Lista de mesas |
| `table_joined` | `{ tableState }` | Entraste a una mesa |
| `table_left` | `{}` | Saliste de la mesa |
| `game_started` | `{ gameState }` | La partida comenzó |
| `dice_rolled` | `{ white: [n,n], red, green, blue, yellow }` | Resultado tirada |
| `action_1_prompt` | `{ sum: number }` | Pedir elección Acción 1 |
| `action_2_prompt` | `{ bases: [n,n], colorDice: {name, value} }` | Pedir elección Acción 2 |
| `player_updated` | `{ playerId, filas, penalties }` | Estado actualizado de jugador |
| `turn_change` | `{ playerId }` | Cambio de turno |
| `row_locked` | `{ color, playerId }` | Fila bloqueada |
| `game_over` | `{ results: [{username, score}] }` | Fin de partida |
| `chat_message` | `{ username, text, timestamp }` | Mensaje de chat |
| `rankings` | `{ rankings }` | Ranking global |
| `table_player_joined` | `{ playerId, username }` | Jugador se unió a tu mesa |
| `table_player_left` | `{ playerId, username }` | Jugador salió de tu mesa |

---

## 5. Motor de Reglas (game/gameLogic.js)

### 5.1 Estado de Partida

```javascript
{
  id: string,
  players: [
    {
      id: string,
      username: string,
      filas: {
        red: { marked: [boolean 11], locked: boolean, count: number },
        yellow: { marked: [boolean 11], locked: boolean, count: number },
        green: { marked: [boolean 11], locked: boolean, count: number },
        blue: { marked: [boolean 11], locked: boolean, count: number }
      },
      penalties: number, // 0-4
      score: number
    }
  ],
  phase: 'rolling' | 'action1' | 'action2' | 'penalty' | 'gameover',
  activePlayer: string, // playerId
  dice: { white: [n,n], red: n|null, green: n|null, blue: n|null, yellow: n|null },
  lockedRows: [], // colores bloqueados globalmente
  turnNumber: 0,
  action1Choices: {}, // playerId → color|null
  startedAt: timestamp
}
```

### 5.2 Validaciones Críticas (SERVER SIDE)

Todas las validaciones se ejecutan en el servidor. El cliente solo envía intenciones.

#### Direccionalidad

```javascript
function getNextNumber(fila) {
  // Roja/Amarilla: 2→12 (índice 0→10)
  // Verde/Azul: 12→2 (índice 0→10)
  const values = (fila === 'red' || fila === 'yellow')
    ? [2,3,4,5,6,7,8,9,10,11,12]
    : [12,11,10,9,8,7,6,5,4,3,2];
  for (let i = 0; i < 11; i++) {
    if (!fila.marked[i]) return values[i];
  }
  return null; // fila completa
}

function canMark(fila, number) {
  if (fila.locked) return false;
  const next = getNextNumber(fila);
  return next === number;
}
```

#### Acción 1

```javascript
function validateAction1(player, fila, suma) {
  // 1. Fila no bloqueada
  // 2. suma es el siguiente número válido en esa fila
  // 3. El jugador no ha elegido ya otra fila este turno
  // 4. La fila existe (red, yellow, green, blue)
  return canMark(player.filas[fila], suma);
}
```

#### Acción 2

```javascript
function validateAction2(player, fila, numero) {
  // 1. Es el jugador activo
  // 2. Fila no bloqueada
  // 3. numero = dadoBase[idx] + dadoColor[fila]
  // 4. numero es el siguiente válido en la fila
  return isActivePlayer && canMark(player.filas[fila], numero);
}
```

#### Penalización

```javascript
function shouldPenalize(player) {
  // Si el jugador activo NO tachó nada en Acción 1 Y NO tachó nada en Acción 2
  return !player.action1Choice && !player.action2Choice;
}
```

#### Bloqueo de Fila

```javascript
function checkRowLock(player, fila) {
  const count = player.filas[fila].count;
  const lastIndex = (fila === 'red' || fila === 'yellow') ? 10 : 0;
  // El último número solo se puede tachar si count >= 5 (antes de tachar)
  // count ya debe ser >= 5 después de marcar
  if (count >= 5 && player.filas[fila].marked[lastIndex]) {
    // Bloquear fila globalmente
    return true;
  }
  return false;
}
```

#### Fin de Juego

```javascript
function checkGameOver(state) {
  // 1. Algún jugador tiene 4 penalizaciones
  // 2. 2 o más filas bloqueadas globalmente
  for (const player of state.players) {
    if (player.penalties >= 4) return true;
  }
  return state.lockedRows.length >= 2;
}
```

#### Puntuación

```javascript
function calculateScore(fila) {
  const n = fila.count;
  return (n * (n + 1)) / 2;
}

function getTotalScore(player) {
  const rowScores = Object.values(player.filas)
    .map(f => calculateScore(f))
    .reduce((a, b) => a + b, 0);
  return rowScores - (player.penalties * 5);
}
```

### 5.3 Flujo del Turno

```
Fase 0: INICIO
  - Cada jugador "tira" (simulado) hasta que alguien saca un 6
  - Ese jugador es el activo inicial
  - Estado: 'rolling'

Fase 1: TIRADA
  - Servidor genera dados con CryptoPureSource
  - Broadcast: dice_rolled
  - Estado: 'action1'

Fase 2: ACCIÓN 1 (Suma dados blancos)
  - Servidor: action_1_prompt con suma
  - TODOS los jugadores envían action_1_choice
  - Cuando todos responden (o timeout 60s):
    - Validar cada elección
    - Aplicar tachaduras
    - Verificar bloqueos simultáneos
    - Estado: 'action2'

Fase 3: ACCIÓN 2 (Suma base + color)
  - Servidor: action_2_prompt con bases y dados color
  - Solo el activo envía action_2_choice
  - Validar elección
  - Estado: 'penalty_check'

Fase 4: PENALIZACIÓN
  - Si activo no tachó nada en Acc1 ni Acc2 → +1 penalización
  - Verificar fin de juego (4 penalizaciones o 2 filas bloqueadas)

Fase 5: CAMBIO DE TURNO
  - Si game over → calcular puntuaciones, guardar ranking
  - Sino → siguiente jugador, estado: 'rolling'
```

### 5.4 Timeout (60s)

```javascript
// Por cada jugador que debe tomar una decisión:
setTimeout(() => {
  if (!player.responded) {
    // Acción 1: tratar como "no tachar nada"
    // Acción 2: tratar como "no tachar nada"
    player.responded = true;
    processPendingActions();
  }
}, 60000);
```

---

## 6. RNG — CryptoPureSource Server-Side (game/rng.js)

### 6.1 Implementación

```javascript
const crypto = require('crypto');

class CryptoPureSource {
  nextInt(min, max) {
    const range = max - min + 1;
    // Leer 4 bytes para entropía suficiente y evitar sesgo de módulo
    const bytes = crypto.randomBytes(4);
    const value = bytes.readUInt32BE(0);
    return min + (value % range);
  }

  rollDice(activeColors) {
    const white = [this.nextInt(1, 6), this.nextInt(1, 6)];
    const dice = { white };
    const colors = ['red', 'green', 'blue', 'yellow'];
    for (const color of colors) {
      if (activeColors.includes(color)) {
        dice[color] = this.nextInt(1, 6);
      } else {
        dice[color] = null;
      }
    }
    return dice;
  }
}

module.exports = new CryptoPureSource();
```

### 6.2 Flujo de Tirada

1. Cliente activo envía `roll_dice` al servidor
2. Servidor identifica colores activos (no bloqueados)
3. Servidor llama `CryptoPureSource.rollDice(activeColors)`
4. Servidor emite `dice_rolled` a todos en la sala
5. Servidor cambia fase a `action1`

### 6.3 Sesgo de Módulo

`4294967296 / 6 = 715827882.66...`, resto: 4. Los números 0-3 tienen sesgo de ~9.3e-10. Despreciable para dados.

---

## 7. Cliente SPA (public/)

### 7.1 Estructura del HTML (index.html)

```html
<div id="app">
  <!-- Vista Login -->
  <div id="view-login" class="view active">...</div>

  <!-- Vista Lobby -->
  <div id="view-lobby" class="view">
    <header><!-- top-bar con logo, botón ayuda, theme toggle --></header>
    <div class="lobby-layout">
      <div class="lobby-main">
        <div class="players-section">
          <h2>Jugadores Conectados</h2>
          <ul id="players-list"></ul>
        </div>
        <div class="tables-section">
          <h2>Mesas de Juego</h2>
          <button id="btn-create-table">+ Crear Mesa</button>
          <ul id="tables-list"></ul>
        </div>
        <div class="rankings-section">
          <h2>Ranking Global</h2>
          <ol id="rankings-list"></ol>
        </div>
      </div>
      <div class="lobby-chat">
        <!-- Chat lateral -->
      </div>
    </div>
  </div>

  <!-- Vista Juego -->
  <div id="view-game" class="view">
    <header><!-- top-bar con info partida, botón salir --></header>
    <div class="game-layout">
      <div class="game-boards">
        <div id="my-board" class="board own"><!-- Cartón propio grande --></div>
        <div id="others-boards" class="boards-mini"><!-- Cartones ajenos --></div>
      </div>
      <div class="game-sidebar">
        <div class="dice-area"><!-- Dados + botón tirar --></div>
        <div class="scores-table"><!-- Tabla puntuaciones --></div>
        <div class="game-chat"><!-- Chat de partida --></div>
      </div>
    </div>
  </div>
</div>
```

### 7.2 Controlador SPA (app.js)

```javascript
const App = {
  views: { login, lobby, game },
  currentView: null,
  socket: null,
  user: null,
  tableId: null,

  init() {
    this.socket = io();
    this.setupSocketEvents();
    this.restoreSession();
  },

  showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${name}`).classList.add('active');
    this.currentView = name;
  },

  setupSocketEvents() {
    this.socket.on('login_success', (data) => { ... });
    this.socket.on('players_update', (data) => { ... });
    this.socket.on('tables_update', (data) => { ... });
    this.socket.on('table_joined', (data) => { ... });
    this.socket.on('game_started', (data) => { ... });
    this.socket.on('dice_rolled', (data) => { ... });
    // ... etc
  },

  restoreSession() {
    const saved = Storage.get('username');
    if (saved) {
      document.getElementById('login-name').value = saved;
    }
    const theme = Storage.get('theme');
    if (theme) Theme.set(theme);
  }
};
```

### 7.3 Cartón Propio (game.js — vista interactiva)

```javascript
function renderMyBoard(player) {
  const board = document.getElementById('my-board');
  board.innerHTML = '';
  const rows = ['red', 'yellow', 'green', 'blue'];
  const labels = { red: 'ROJA', yellow: 'AMARILLA', green: 'VERDE', blue: 'AZUL' };
  const diceIcons = { red: '🔴', yellow: '🟡', green: '🟢', blue: '🔵' };

  for (const row of rows) {
    const fila = player.filas[row];
    const isAsc = (row === 'red' || row === 'yellow');
    const values = isAsc ? [2,3,4,5,6,7,8,9,10,11,12] : [12,11,10,9,8,7,6,5,4,3,2];

    const rowEl = document.createElement('div');
    rowEl.className = `board-row ${row}${fila.locked ? ' locked' : ''}`;

    // Label
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = `${diceIcons[row]} ${labels[row]}`;
    rowEl.appendChild(label);

    // Numbers
    const numbersDiv = document.createElement('div');
    numbersDiv.className = 'row-numbers';
    for (let i = 0; i < 11; i++) {
      const numEl = document.createElement('button');
      numEl.className = `row-number${fila.marked[i] ? ' marked' : ''}`;
      numEl.textContent = values[i];
      numEl.dataset.index = i;
      numEl.dataset.value = values[i];
      numEl.dataset.row = row;
      if (!fila.marked[i] && !fila.locked) {
        numEl.addEventListener('click', () => onNumberClick(row, values[i]));
      }
      numbersDiv.appendChild(numEl);
    }

    // Lock icon
    const lockEl = document.createElement('div');
    lockEl.className = `row-lock${fila.locked ? ' locked' : ''}`;
    lockEl.textContent = fila.locked ? '🔒' : '🔓';

    rowEl.appendChild(numbersDiv);
    rowEl.appendChild(lockEl);
    board.appendChild(rowEl);
  }

  // Penalizaciones
  const penDiv = document.createElement('div');
  penDiv.className = 'penalties';
  for (let i = 0; i < 4; i++) {
    const p = document.createElement('span');
    p.className = `penalty-box${i < player.penalties ? ' filled' : ''}`;
    penDiv.appendChild(p);
  }
  board.appendChild(penDiv);
}
```

### 7.4 Cartón Ajeno (esquemático)

```javascript
function renderOtherBoard(player) {
  const el = document.createElement('div');
  el.className = 'mini-board';
  el.innerHTML = `
    <div class="mini-player-name">${player.username}</div>
    <div class="mini-rows">
      <div class="mini-row red">
        <span class="mini-label">🔴</span>
        <div class="mini-bar" style="width: ${(player.filas.red.count / 12) * 100}%"></div>
      </div>
      <div class="mini-row yellow">
        <span class="mini-label">🟡</span>
        <div class="mini-bar" style="width: ${(player.filas.yellow.count / 12) * 100}%"></div>
      </div>
      <div class="mini-row green">
        <span class="mini-label">🟢</span>
        <div class="mini-bar" style="width: ${(player.filas.green.count / 12) * 100}%"></div>
      </div>
      <div class="mini-row blue">
        <span class="mini-label">🔵</span>
        <div class="mini-bar" style="width: ${(player.filas.blue.count / 12) * 100}%"></div>
      </div>
    </div>
    <div class="mini-penalties">${'⬜'.repeat(player.penalties)}${'⬛'.repeat(4 - player.penalties)}</div>
    <div class="mini-score">${getTotalScore(player)} pts</div>
  `;
  return el;
}
```

### 7.5 Dados con Animación 3D (game.js)

```javascript
function renderDice(dice, canRoll) {
  const area = document.getElementById('dice-area');
  area.innerHTML = `
    <div class="dice-container">
      ${dice.white.map((v, i) => `
        <div class="dice dice-white" data-value="${v}">
          <div class="dice-face">${renderDieFace(v)}</div>
        </div>
      `).join('')}
      ${renderColoredDie('red', dice.red)}
      ${renderColoredDie('green', dice.green)}
      ${renderColoredDie('blue', dice.blue)}
      ${renderColoredDie('yellow', dice.yellow)}
    </div>
    ${canRoll ? '<button id="btn-roll" class="btn-roll">🎲 Tirar Dados</button>' : ''}
  `;

  // Trigger animation
  document.querySelectorAll('.dice').forEach(d => {
    d.style.animation = 'dice-roll 0.6s ease-out';
  });

  // Sound effect
  Audio.playDiceRoll();
}
```

```css
/* Animación 3D de dados */
@keyframes dice-roll {
  0% { transform: rotateX(0deg) rotateY(0deg) scale(0.5); opacity: 0; }
  50% { transform: rotateX(720deg) rotateY(360deg) scale(1.2); }
  100% { transform: rotateX(720deg) rotateY(360deg) scale(1); opacity: 1; }
}

.dice {
  display: inline-flex;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
  box-shadow: var(--shadow-md);
  perspective: 600px;
}
.dice-white { background: #f0f0f0; color: #333; border: 2px solid #ccc; }
.dice[data-color="red"] { background: var(--dice-red); }
.dice[data-color="green"] { background: var(--dice-green); }
.dice[data-color="blue"] { background: var(--dice-blue); }
.dice[data-color="yellow"] { background: var(--dice-yellow); color: #333; }
```

### 7.6 Sonido con Web Audio API (audio.js)

```javascript
const Audio = {
  ctx: null,

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },

  playDiceRoll() {
    if (!this.ctx) this.init();
    // Tono de impacto de dados: ruido blanco filtrado corto
    const duration = 0.15;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.3;
    source.connect(filter).connect(gain).connect(this.ctx.destination);
    source.start();
  },

  playMark() {
    // Tono corto ascendente para tachar número
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  },

  playLock() {
    // Tono grave para bloqueo de fila
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  },

  playGameOver() {
    // Secuencia descendente
    [523, 493, 440, 392].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.2 + 0.3);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.2);
      osc.stop(this.ctx.currentTime + i * 0.2 + 0.3);
    });
  }
};
```

---

## 8. Sala de Espera (Lobby)

### 8.1 Layout

```
┌──────────────────────────────────────────────────────┐
│ 🎲 Qwixx Online              [?]  🌙  User           │
├─────────────────────────┬────────────────────────────┤
│                         │  💬 CHAT                    │
│  👥 Jugadores (5)       │  [________________] [▶]    │
│  • Alice (en mesa)      │  Alice: hola               │
│  • Bob                  │  Bob: lista?               │
│  • Charlie (en mesa)    │  Carlos: si                │
│  • Diana                │                            │
│  • Eve                  │                            │
│                         │                            │
│  🎮 Mesas (2)           │                            │
│  ┌──────────────────┐   │                            │
│  │ Mesa de Alice    │   │                            │
│  │ 3/4 jugadores    │   │                            │
│  │ [Unirse]         │   │                            │
│  └──────────────────┘   │                            │
│  ┌──────────────────┐   │                            │
│  │ Partida rápida   │   │                            │
│  │ 1/4 jugadores    │   │                            │
│  │ [Unirse]         │   │                            │
│  └──────────────────┘   │                            │
│                         │                            │
│  [+ Crear Mesa]         │                            │
│                         │                            │
│  🏆 Ranking Global      │                            │
│  1. Alice — 245         │                            │
│  2. Bob — 210           │                            │
│  3. Charlie — 198       │                            │
├─────────────────────────┴────────────────────────────┤
│  v0.8.0                                              │
└──────────────────────────────────────────────────────┘
```

### 8.2 Modal Crear Mesa

```
┌────────────────────┐
│  Crear Mesa         │
│                     │
│  Nombre: [________] │
│                     │
│  Invitar:           │
│  ☑ Alice            │
│  ☐ Bob              │
│  ☐ Charlie          │
│  ☐ Diana            │
│                     │
│  [Cancelar] [Crear] │
└────────────────────┘
```

### 8.3 Chat

- Entrada de texto + botón enviar
- Mensajes con formato: `[HH:MM] Usuario: texto`
- Mensajes de sistema: "Alice se ha unido", "Bob ha creado una mesa"
- Scrolling automático al último mensaje

---

## 9. Vista de Juego

### 9.1 Layout

```
┌────────────────────────────────────────────────────────┐
│  🎲 Mesa: Partida rápida          ⏱ 45s  [?]  🌙  Salir│
├───────────────────────────────────┬────────────────────┤
│                                   │  🎲 DADOS           │
│  🔴 ROJA   2  3  4  5  6  7  8  9 10 11 12 🔓 │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  🟡 AMARILLA 2  3  4  5  6  7  8  9 10 11 12 🔓 │  │4 │ │2 │ │3 │ │5 │ │1 │ │6 │ │
│  🟢 VERDE  12 11 10  9  8  7  6  5  4  3  2 🔓 │  │⚪│ │⚪│ │🔴│ │🟢│ │🔵│ │🟡│ │
│  🔵 AZUL   12 11 10  9  8  7  6  5  4  3  2 🔓 │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│  Penalizaciones: ⬜ ⬜ ⬜ ⬜                    │  [🎲 Tirar Dados]                │
│                                   │                                   │
│  ──── OTROS JUGADORES ────        │  📊 PUNTUACIONES                 │
│                                   │  ┌────────────────────┐          │
│  Alice  🔴████░░░░░░ ████░░░░░░   │  │ Jugador  │ Puntos │          │
│         🟢██████░░░░ ██████░░░░   │  ├──────────┼────────┤          │
│         🔵██░░░░░░░░             │  │ Tú       │   45   │          │
│         Penal: ⬜⬜⬜⬛ Pts: 32   │  │ Alice    │   38   │          │
│                                   │  │ Bob      │   12   │          │
│  Bob    🔴░░░░░░░░░░ ░░░░░░░░░░  │  └──────────┴────────┘          │
│         🟢██░░░░░░░░ ██░░░░░░░░  │                                   │
│         🔵░░░░░░░░░░             │  💬 CHAT                        │
│         Penal: ⬜⬜⬛⬛ Pts: 5    │  [________________] [▶]        │
│                                   │  Alice: buena tirada!           │
│                                   │                                   │
└───────────────────────────────────┴────────────────────┘
```

### 9.2 Acción 1 — Selección de Fila

Cuando todos los jugadores deben elegir:

```javascript
// Modo selección: cada número válido es clickeable
// Los números clickeables son solo los que coinciden con suma_blancos
// y son el siguiente número válido en esa fila

function getAvailableRows(suma, player) {
  const available = [];
  for (const color of ['red', 'yellow', 'green', 'blue']) {
    if (canMark(player.filas[color], suma)) {
      available.push(color);
    }
  }
  return available;
}

// UI: los números válidos se resaltan con un glow/pulso
// Al hacer clic, se envía action_1_choice
// Botón "Pasar" para no tachar nada
```

### 9.3 Acción 2 — Selección de Combinación (solo activo)

```javascript
function getAction2Options(baseDice, colorDice) {
  const options = [];
  for (let i = 0; i < 2; i++) {
    const sum = baseDice[i] + colorDice.value;
    options.push({ baseIdx: i, sum, color: colorDice.name });
  }
  return options; // [{baseIdx:0, sum:7, color:'red'}, {baseIdx:1, sum:5, color:'red'}]
}

// UI: se muestran ambas opciones como botones grandes
// "7 (4+3)" y "5 (1+4)" por ejemplo
// Botón "No tachar nada"
```

### 9.4 Timer de Turno

```javascript
function startTurnTimer(seconds = 60) {
  const timerEl = document.getElementById('turn-timer');
  let remaining = seconds;
  timerEl.textContent = `⏱ ${remaining}s`;
  timerEl.className = remaining <= 10 ? 'timer-warning' : '';

  const interval = setInterval(() => {
    remaining--;
    timerEl.textContent = `⏱ ${remaining}s`;
    timerEl.className = remaining <= 10 ? 'timer-warning' : '';
    if (remaining <= 0) {
      clearInterval(interval);
      // Timeout: se envía elección por defecto (no tachar)
      App.socket.emit('action_1_choice', { color: null });
    }
  }, 1000);
}
```

### 9.5 Fin de Partida

```javascript
// Modal de resultados:
function showGameOver(results) {
  results.sort((a, b) => b.score - a.score);
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🏆 ¡Partida Terminada!</h2>
      <ol class="results-list">
        ${results.map((r, i) => `
          <li class="${i === 0 ? 'winner' : ''}">
            <span class="rank">#${i + 1}</span>
            <span class="name">${r.username}</span>
            <span class="score">${r.score} pts</span>
          </li>
        `).join('')}
      </ol>
      <div class="results-details">
        ${results.map(r => `
          <div class="result-player">
            <strong>${r.username}</strong>
            <div>🔴 ${r.details.red} 🟡 ${r.details.yellow} 🟢 ${r.details.green} 🔵 ${r.details.blue}</div>
            <div>Penalizaciones: ${r.penalties} (-${r.penalties * 5})</div>
            <div>Total: ${r.score}</div>
          </div>
        `).join('')}
      </div>
      <button onclick="App.leaveGame()">Volver al Lobby</button>
    </div>
  `;
  document.body.appendChild(modal);
  Audio.playGameOver();
}
```

---

## 10. Ranking Global

### 10.1 Estructura del JSON

```json
{
  "rankings": [
    { "username": "Alice", "score": 245, "games": 3, "wins": 2, "lastPlayed": "2026-06-20T10:30:00Z" },
    { "username": "Bob", "score": 210, "games": 5, "wins": 1, "lastPlayed": "2026-06-20T09:15:00Z" }
  ]
}
```

### 10.2 Actualización al Finalizar Partida

```javascript
function updateRanking(results) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/rankings.json'), 'utf8'));
  const winner = results[0]; // sorted by score desc

  for (const r of results) {
    const existing = data.rankings.find(entry => entry.username === r.username);
    if (existing) {
      existing.score += r.score;
      existing.games++;
      if (r.username === winner.username) existing.wins++;
      existing.lastPlayed = new Date().toISOString();
    } else {
      data.rankings.push({
        username: r.username,
        score: r.score,
        games: 1,
        wins: r.username === winner.username ? 1 : 0,
        lastPlayed: new Date().toISOString()
      });
    }
  }

  // Ordenar por score descendente
  data.rankings.sort((a, b) => b.score - a.score);
  fs.writeFileSync(path.join(__dirname, '../data/rankings.json'), JSON.stringify(data, null, 2));
}
```

### 10.3 Visualización en Lobby

```javascript
function renderRankings(rankings) {
  const list = document.getElementById('rankings-list');
  list.innerHTML = rankings.map((r, i) => `
    <li class="ranking-entry ${i < 3 ? 'top-' + (i+1) : ''}">
      <span class="rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
      <span class="name">${r.username}</span>
      <span class="score">${r.score}</span>
      <span class="stats">${r.wins}/${r.games} victorias</span>
    </li>
  `).join('');
}
```

---

## 11. Página de Ayuda (docs/index.html)

### 11.1 Estructura (basada en DOCS_ARCHITECTURE.md)

```
docs/
└── index.html    # Página única: todas las reglas + funcionamiento
```

Incluida en `public/` para servirla estáticamente.

### 11.2 Secciones

1. **Introducción** — qué es Qwixx, objetivo del juego
2. **Cómo jugar** — flujo de la partida, cómo usar la web
3. **Reglas detalladas** — basadas en reglamento.md
   - Direccionalidad de filas
   - Acción 1 y Acción 2
   - Penalizaciones
   - Bloqueo de filas
   - Fin de juego
4. **Puntuación** — tabla de puntuación, fórmula
5. **FAQ** — preguntas frecuentes
6. **Atajos de teclado** — si aplican
7. **Solución de problemas** — errores comunes

### 11.3 Componentes

- Sidebar estilo ReadTheDocs (navegación jerárquica)
- Top-bar con logo + theme toggle
- Callouts (warning para reglas importantes, info para notas)
- Tablas para puntuación
- Espacios para figuras (placeholder)
- Scroll tracking con IntersectionObserver
- Responsive (sidebar oculta < 900px)

---

## 12. Temas Claro/Oscuro (theme.js)

### 12.1 Implementación

```javascript
const Theme = {
  init() {
    const saved = Storage.get('theme') || 'light';
    this.set(saved);
    document.getElementById('btn-theme').addEventListener('click', () => this.toggle());
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.set('theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.set(current === 'dark' ? 'light' : 'dark');
  }
};
```

### 12.2 CSS

```css
:root {
  --bg-primary: #f8f9fa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e9ecef;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-muted: #adb5bd;
  --border-color: #dee2e6;
  --accent-primary: #0d6efd;
  --accent-success: #198754;
  --accent-danger: #dc3545;
  --accent-warning: #ffc107;
  --dice-red: #e74c3c;
  --dice-yellow: #ffc107;
  --dice-green: #27ae60;
  --dice-blue: #0d6efd;
  --dice-white: #6c757d;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --radius-sm: 4px;
  --radius-md: 8px;
  --transition-fast: 150ms ease;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-2xl: 24px;
}

[data-theme="dark"] {
  --bg-primary: #1a1d21;
  --bg-secondary: #212529;
  --bg-tertiary: #2d3238;
  --text-primary: #e9ecef;
  --text-secondary: #adb5bd;
  --text-muted: #6c757d;
  --border-color: #373b3e;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.3);
}
```

---

## 13. LocalStorage (storage.js)

```javascript
const Storage = {
  get(key) {
    try {
      return localStorage.getItem(`qwixx_${key}`);
    } catch { return null; }
  },
  set(key, value) {
    try {
      localStorage.setItem(`qwixx_${key}`, value);
    } catch { /* storage full */ }
  },
  remove(key) {
    try {
      localStorage.removeItem(`qwixx_${key}`);
    } catch { /* ignore */ }
  }
};

// Claves usadas:
// qwixx_username → string
// qwixx_theme → 'light' | 'dark'
// qwixx_userId → string (UUID generado en primera visita)
```

---

## 14. package.json

```json
{
  "name": "qwixx-online",
  "version": "0.8.0",
  "description": "Qwixx multiplayer online game",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "socket.io": "^4.7.0"
  }
}
```

---

## 15. Implementación por Fases

### Fase 1: Fundación
- [x] `package.json` y `npm install`
- [x] `server.js` básico (Express + Socket.IO + static)
- [x] `game/rng.js` (CryptoPureSource)
- [x] `public/index.html` (estructura SPA básica con 3 vistas ocultas)
- [x] `public/css/styles.css` (variables CSS, reset, layout básico)
- [x] `public/js/app.js` (esqueleto controlador SPA)
- [x] `public/js/storage.js` y `public/js/theme.js`

### Fase 2: Conexión y Lobby
- [x] Handshake servidor-cliente (login con nombre único)
- [x] `public/js/lobby.js` (lista jugadores, mesas, ranking)
- [x] `public/js/chat.js` (componente chat funcional)
- [x] Modal crear mesa con selección de invitados
- [x] Unirse/salir de mesas

### Fase 3: Motor de Juego
- [x] `game/gameState.js` (gestión de partidas en memoria)
- [x] `game/gameLogic.js` (validaciones, scoring, bloqueos)
- [x] Servidor maneja ciclo completo de turno
- [x] Timers de timeout (60s)

### Fase 4: UI de Juego
- [x] `public/js/game.js` (renderizado cartón propio)
- [x] Cartones ajenos esquemáticos
- [x] Dados animados 3D + botón tirar
- [x] `public/js/audio.js` (efectos sonido)
- [x] Tabla de puntuaciones en tiempo real
- [x] Modal de fin de partida

### Fase 5: Documentación y Polish
- [x] `public/docs/index.html` (página de ayuda)
- [x] Ranking global persistente
- [x] Responsive design
- [x] Testing manual de flujos
- [x] Manejo de desconexiones y reconexiones

---

## 16. Casos Borde y Consideraciones

### Desconexiones
- Si un jugador se desconecta durante la partida → mantener su estado, dar 60s timeout por turno
- Si el host se desconecta → transferir host al siguiente jugador en la mesa
- Si quedan < 2 jugadores → partida cancelada

### Reconexiones
- Guardar sessionId en localStorage
- Al reconectar, restaurar mesa si sigue activa
- Sincronizar estado completo al reconectar

### Bloqueo Simultáneo (regla 5.4 del reglamento)
- Si varios jugadores pueden bloquear la misma fila en Acción 1, todos pueden hacerlo
- Implementación: después de marcar Acción 1 para todos, verificar bloqueos de cada uno

### Validación de nombres
- Mínimo 2 caracteres, máximo 20
- Sin caracteres especiales (solo letras, números, guiones, espacios)
- Único (no puede haber dos jugadores con el mismo nombre conectados)

### Rendimiento
- El estado de partida se mantiene en memoria del servidor (RAM)
- Para N partidas simultáneas con M jugadores cada una, el costo es O(N × M) en memoria
- Socket.IO maneja la multiplexación de conexiones eficientemente

### Seguridad
- Todas las validaciones de reglas en servidor (nunca confiar en cliente)
- RNG exclusivamente server-side
- Rate limiting básico en eventos críticos (roll_dice, etc.)
- Validación de nombres: sanitizar contra XSS
```

<｜｜DSML｜｜parameter name="filePath" string="true">/var/home/carly/Escritorio/qwixx/PLAN.md