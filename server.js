// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GameManager = require('./game/gameState');
const rng = require('./game/rng');
const gameLogic = require('./game/gameLogic');
const rankingsPath = path.join(__dirname, 'data', 'rankings.json');

function loadRankings() {
  try {
    return JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
  } catch {
    return { rankings: [] };
  }
}

function saveRankings(data) {
  fs.writeFileSync(rankingsPath, JSON.stringify(data, null, 2));
}

app.get('/api/rankings', (req, res) => {
  res.json(loadRankings());
});

app.post('/api/rankings', (req, res) => {
  const { results } = req.body;
  if (!results || !Array.isArray(results)) {
    return res.status(400).json({ error: 'Invalid results' });
  }
  const data = loadRankings();
  for (const r of results) {
    const existing = data.rankings.find(e => e.username === r.username);
    if (existing) {
      if ((r.score || 0) > existing.score) existing.score = r.score || 0;
      existing.games = (existing.games || 0) + 1;
      if (r.win) existing.wins = (existing.wins || 0) + 1;
      existing.lastPlayed = new Date().toISOString();
    } else {
      data.rankings.push({
        username: r.username,
        score: r.score || 0,
        games: 1,
        wins: r.win ? 1 : 0,
        lastPlayed: new Date().toISOString()
      });
    }
  }
  data.rankings.sort((a, b) => b.score - a.score);
  if (data.rankings.length > 50) {
    data.rankings = data.rankings.slice(0, 50);
  }
  saveRankings(data);
  res.json({ success: true });
});

const connectedPlayers = new Map();
const playerSockets = new Map();

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  let currentUser = null;

  socket.on('set_username', ({ name }) => {
    if (!name || typeof name !== 'string') {
      socket.emit('error', { message: 'Nombre inválido' });
      return;
    }
    const trimmed = name.trim().slice(0, 20);
    if (trimmed.length < 2) {
      socket.emit('error', { message: 'El nombre debe tener al menos 2 caracteres' });
      return;
    }
    if (!/^[a-zA-Z0-9\u00C0-\u024F\s\-_]+$/.test(trimmed)) {
      socket.emit('error', { message: 'Caracteres no válidos en el nombre' });
      return;
    }
    const exists = Array.from(connectedPlayers.values()).some(p => p.username === trimmed && p.connected);
    if (exists) {
      socket.emit('error', { message: 'Ese nombre ya está en uso' });
      return;
    }
    currentUser = {
      id: socket.id,
      username: trimmed,
      connected: true,
      inTable: null
    };
    connectedPlayers.set(socket.id, currentUser);
    playerSockets.set(socket.id, socket);
    socket.join('lobby');
    socket.emit('login_success', { username: trimmed, id: socket.id });
    broadcastPlayers();
    broadcastTables();
  });

  socket.on('chat_message', ({ text }) => {
    if (!currentUser || !text || typeof text !== 'string') return;
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    const msg = {
      username: currentUser.username,
      text: trimmed,
      timestamp: Date.now(),
      system: false
    };
    if (currentUser.inTable) {
      io.to(`table:${currentUser.inTable}`).emit('chat_message', msg);
    } else {
      io.to('lobby').emit('chat_message', msg);
    }
  });

  socket.on('create_table', ({ name, password }) => {
    if (!currentUser) return;
    const tName = (name || `Mesa de ${currentUser.username}`).trim().slice(0, 30) || `Mesa de ${currentUser.username}`;
    const table = GameManager.createTable(tName, currentUser.id, currentUser.username, password);
    currentUser.inTable = table.id;
    socket.join(`table:${table.id}`);
    socket.leave('lobby');
    socket.emit('table_joined', { tableState: table });
    broadcastTablePlayers(table.id);
    broadcastTables();
    broadcastPlayers();
    io.to('lobby').emit('chat_message', {
      username: 'Sistema',
      text: `${currentUser.username} ha creado la mesa "${tName}"`,
      timestamp: Date.now(),
      system: true
    });
  });

  socket.on('join_table', ({ tableId, password }) => {
    if (!currentUser) return;
    const table = GameManager.getTable(tableId);
    if (!table) {
      socket.emit('error', { message: 'La mesa no existe' });
      return;
    }
    if (table.status !== 'waiting') {
      socket.emit('error', { message: 'La partida ya comenzó' });
      return;
    }
    if (table.players.length >= 5) {
      socket.emit('error', { message: 'Mesa llena (máx 5 jugadores)' });
      return;
    }
    if (table.password && table.password !== password) {
      socket.emit('error', { message: 'Contraseña incorrecta' });
      return;
    }
    const added = GameManager.addPlayerToTable(tableId, currentUser.id, currentUser.username, password);
    if (!added) {
      socket.emit('error', { message: 'No se pudo unir a la mesa' });
      return;
    }
    currentUser.inTable = tableId;
    socket.join(`table:${tableId}`);
    socket.leave('lobby');
    socket.emit('table_joined', { tableState: table });
    socket.to(`table:${tableId}`).emit('table_player_joined', {
      playerId: currentUser.id,
      username: currentUser.username
    });
    broadcastTablePlayers(tableId);
    broadcastTables();
    broadcastPlayers();
    io.to(`table:${tableId}`).emit('chat_message', {
      username: 'Sistema',
      text: `${currentUser.username} se ha unido a la mesa`,
      timestamp: Date.now(),
      system: true
    });
  });

  socket.on('leave_table', () => {
    leaveCurrentTable();
  });

  socket.on('start_game', () => {
    if (!currentUser || !currentUser.inTable) return;
    const table = GameManager.getTable(currentUser.inTable);
    if (!table) return;
    if (table.hostId !== currentUser.id) {
      socket.emit('error', { message: 'Solo el anfitrión puede iniciar la partida' });
      return;
    }
    if (table.players.length < 1) {
      socket.emit('error', { message: 'La mesa está vacía' });
      return;
    }
    const gameState = GameManager.startGame(currentUser.inTable);
    if (!gameState) {
      socket.emit('error', { message: 'Error al iniciar la partida' });
      return;
    }
    startTurn(table.id);
    io.to(`table:${table.id}`).emit('game_started', { gameState: table.game });
    io.to(`table:${table.id}`).emit('chat_message', {
      username: 'Sistema',
      text: '¡La partida ha comenzado!',
      timestamp: Date.now(),
      system: true
    });
  });

  socket.on('roll_dice', () => {
    if (!currentUser || !currentUser.inTable) return;
    const table = GameManager.getTable(currentUser.inTable);
    if (!table || !table.game || table.game.phase !== 'rolling') return;
    const player = table.game.players.find(p => p.id === currentUser.id);
    if (!player || !player.isActive) {
      socket.emit('error', { message: 'No es tu turno' });
      return;
    }
    const activeColors = ['red', 'yellow', 'green', 'blue'].filter(c => !table.game.lockedRows.includes(c));
    const dice = rng.rollDice(activeColors);
    table.game.dice = dice;
    table.game.phase = 'action1';
    const sum = dice.white[0] + dice.white[1];
    table.game.pendingChoices = {};
    for (const p of table.game.players) {
      table.game.pendingChoices[p.id] = undefined;
    }

    let timerSeconds = 60;
    if (table.game.turnTimer) clearTimeout(table.game.turnTimer);
    table.game.turnTimer = setTimeout(() => {
      processAction1Timeouts(table);
    }, timerSeconds * 1000);

    io.to(`table:${table.id}`).emit('dice_rolled', { dice, sum, action1Timeout: timerSeconds });
    io.to(`table:${table.id}`).emit('chat_message', {
      username: 'Sistema',
      text: `${player.username} ha tirado los dados: ${dice.white[0]}+${dice.white[1]}=${sum}`,
      timestamp: Date.now(),
      system: true
    });
  });

  socket.on('action_1_choice', ({ color }) => {
    if (!currentUser || !currentUser.inTable) return;
    const table = GameManager.getTable(currentUser.inTable);
    if (!table || !table.game || table.game.phase !== 'action1') return;
    const sum = table.game.dice.white[0] + table.game.dice.white[1];
    const player = table.game.players.find(p => p.id === currentUser.id);
    if (!player) return;

    if (table.game.pendingChoices[currentUser.id] === undefined) {
      table.game.pendingChoices[currentUser.id] = color;
    }

    const allResponded = Object.values(table.game.pendingChoices).every(c => c !== undefined);
    if (allResponded) {
      if (table.game.turnTimer) clearTimeout(table.game.turnTimer);
      processAction1(table);
    }
  });

  socket.on('action_2_choice', ({ baseIdx, color }) => {
    if (!currentUser || !currentUser.inTable) return;
    const table = GameManager.getTable(currentUser.inTable);
    if (!table || !table.game || table.game.phase !== 'action2') return;
    const player = table.game.players.find(p => p.id === currentUser.id);
    if (!player || !player.isActive) return;

    if (table.game.turnTimer) clearTimeout(table.game.turnTimer);

    if (color && baseIdx !== undefined) {
      const dice = table.game.dice;
      const sum = dice.white[baseIdx] + dice[color];
      const result = gameLogic.validateAction2(player, color, sum);
      if (result.valid) {
        gameLogic.applyMark(player, color, sum);
        table.game.lastAction2Chosen = true;
        io.to(`table:${table.id}`).emit('player_updated', {
          playerId: player.id,
          filas: player.filas,
          penalties: player.penalties
        });
        const rowLabel = { red: 'Roja', yellow: 'Amarilla', green: 'Verde', blue: 'Azul' };
        io.to(`table:${table.id}`).emit('chat_message', {
          username: 'Sistema',
          text: `${player.username} tachó ${sum} en fila ${rowLabel[color]}`,
          timestamp: Date.now(),
          system: true
        });
        if (result.locked) {
          gameLogic.applyLock(table.game, color);
          io.to(`table:${table.id}`).emit('row_locked', { color, playerId: player.id });
          io.to(`table:${table.id}`).emit('chat_message', {
            username: 'Sistema',
            text: `¡Fila ${rowLabel[color]} bloqueada por ${player.username}!`,
            timestamp: Date.now(),
            system: true
          });
        }
      } else {
        socket.emit('chat_message', {
          username: 'Sistema',
          text: `❌ No puedes tachar ${sum} en la fila ${({ red: 'Roja', yellow: 'Amarilla', green: 'Verde', blue: 'Azul' })[color]}. Elige otra combinación.`,
          timestamp: Date.now(),
          system: true
        });
        const bases = table.game.dice.white;
        const availableColors = ['red', 'yellow', 'green', 'blue']
          .filter(c => !table.game.lockedRows.includes(c) && table.game.dice[c] !== null);
        let timerSeconds = 60;
        table.game.turnTimer = setTimeout(() => {
          finishTurn(table);
        }, timerSeconds * 1000);
        io.to(`table:${table.id}`).emit('action_2_prompt', {
          bases,
          availableColors: availableColors.map(c => ({ name: c, value: table.game.dice[c] })),
          timeout: timerSeconds
        });
        return;
      }
    }

    finishTurn(table);
  });

  socket.on('get_rankings', () => {
    socket.emit('rankings', { rankings: loadRankings().rankings });
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    if (currentUser) {
      leaveCurrentTable();
      connectedPlayers.delete(socket.id);
      playerSockets.delete(socket.id);
      broadcastPlayers();
      broadcastTables();
    }
  });

  function leaveCurrentTable() {
    if (!currentUser || !currentUser.inTable) return;
    const tableId = currentUser.inTable;
    const table = GameManager.getTable(tableId);
    if (table) {
      const wasPlaying = table.status === 'playing';
      GameManager.removePlayerFromTable(tableId, currentUser.id);
      socket.to(`table:${tableId}`).emit('table_player_left', {
        playerId: currentUser.id,
        username: currentUser.username
      });
      io.to(`table:${tableId}`).emit('chat_message', {
        username: 'Sistema',
        text: `${currentUser.username} ha salido de la mesa`,
        timestamp: Date.now(),
        system: true
      });
      if (wasPlaying) {
        if (table.game && table.game.turnTimer) clearTimeout(table.game.turnTimer);
        endGame(table);
        broadcastTablePlayers(tableId);
        return;
      }
      if (table.players.length === 0) {
        GameManager.removeTable(tableId);
      } else {
        if (table.hostId === currentUser.id) {
          table.hostId = table.players[0].id;
        }
        broadcastTablePlayers(tableId);
      }
    }
    socket.leave(`table:${tableId}`);
    socket.join('lobby');
    currentUser.inTable = null;
    socket.emit('table_left');
    broadcastTables();
    broadcastPlayers();
  }

  function broadcastPlayers() {
    const players = Array.from(connectedPlayers.values()).map(p => ({
      id: p.id,
      username: p.username,
      inTable: p.inTable
    }));
    io.to('lobby').emit('players_update', { players });
  }

  function broadcastTablePlayers(tableId) {
    const table = GameManager.getTable(tableId);
    if (!table) return;
    io.to(`table:${tableId}`).emit('table_players_update', {
      players: table.players,
      hostId: table.hostId
    });
  }

  function broadcastTables() {
    const tables = GameManager.listTables().map(t => ({
      id: t.id,
      name: t.name,
      hostId: t.hostId,
      hostName: t.hostName,
      playerCount: t.players.length,
      maxPlayers: 5,
      status: t.status,
      hasPassword: !!t.password
    }));
    io.to('lobby').emit('tables_update', { tables });
  }

  function startTurn(tableId) {
    const table = GameManager.getTable(tableId);
    if (!table || !table.game) return;
    const game = table.game;
    const activePlayer = game.players[game.currentPlayerIndex];
    activePlayer.isActive = true;
    game.phase = 'rolling';
    game.dice = { white: [0, 0], red: null, yellow: null, green: null, blue: null };
    io.to(`table:${tableId}`).emit('turn_change', {
      playerId: activePlayer.id,
      username: activePlayer.username
    });
  }

  function processAction1Timeouts(table) {
    for (const p of table.game.players) {
      if (table.game.pendingChoices[p.id] === undefined) {
        table.game.pendingChoices[p.id] = null;
      }
    }
    processAction1(table);
  }

  function processAction1(table) {
    const game = table.game;
    const sum = game.dice.white[0] + game.dice.white[1];
    const pendingLocks = [];
    const rowLabel = { red: 'Roja', yellow: 'Amarilla', green: 'Verde', blue: 'Azul' };
    const action1Messages = [];

    for (const p of game.players) {
      const chosenColor = game.pendingChoices[p.id];
      if (chosenColor) {
        const result = gameLogic.validateAction1(p, chosenColor, sum);
        if (result.valid) {
          gameLogic.applyMark(p, chosenColor, sum);
          io.to(`table:${table.id}`).emit('player_updated', {
            playerId: p.id,
            filas: p.filas,
            penalties: p.penalties
          });
          action1Messages.push(`${p.username} tachó ${sum} en fila ${rowLabel[chosenColor]}`);
          if (result.locked) {
            pendingLocks.push({ playerId: p.id, color: chosenColor });
          }
        } else {
          action1Messages.push(`${p.username} no pudo tachar (movimiento inválido)`);
        }
      } else {
        action1Messages.push(`${p.username} no tachó nada`);
      }
    }

    for (const msg of action1Messages) {
      io.to(`table:${table.id}`).emit('chat_message', {
        username: 'Sistema',
        text: msg,
        timestamp: Date.now(),
        system: true
      });
    }

    for (const lock of pendingLocks) {
      gameLogic.applyLock(game, lock.color);
      const player = game.players.find(p => p.id === lock.playerId);
      io.to(`table:${table.id}`).emit('row_locked', {
        color: lock.color,
        playerId: lock.playerId
      });
      io.to(`table:${table.id}`).emit('chat_message', {
        username: 'Sistema',
        text: `¡Fila ${rowLabel[lock.color]} bloqueada por ${player.username}!`,
        timestamp: Date.now(),
        system: true
      });
    }

    if (gameLogic.checkGameOver(game)) {
      endGame(table);
      return;
    }

    game.phase = 'action2';
    const activePlayer = game.players[game.currentPlayerIndex];
    const bases = game.dice.white;
    const availableColors = ['red', 'yellow', 'green', 'blue'].filter(c => !game.lockedRows.includes(c) && game.dice[c] !== null);

    let timerSeconds = 60;
    game.turnTimer = setTimeout(() => {
      finishTurn(table);
    }, timerSeconds * 1000);

    io.to(`table:${table.id}`).emit('action_2_prompt', {
      bases,
      availableColors: availableColors.map(c => ({ name: c, value: game.dice[c] })),
      timeout: timerSeconds
    });
  }

  function finishTurn(table) {
    const game = table.game;
    if (!game) return;

    const activePlayer = game.players[game.currentPlayerIndex];
    const action1Chosen = game.pendingChoices[activePlayer.id] !== null;
    const action2Chosen = game.lastAction2Chosen;

    if (!action1Chosen && !action2Chosen) {
      gameLogic.applyPenalty(activePlayer);
      const rowLabel = { red: 'Roja', yellow: 'Amarilla', green: 'Verde', blue: 'Azul' };
      io.to(`table:${table.id}`).emit('player_updated', {
        playerId: activePlayer.id,
        filas: activePlayer.filas,
        penalties: activePlayer.penalties
      });
      io.to(`table:${table.id}`).emit('chat_message', {
        username: 'Sistema',
        text: `${activePlayer.username} recibe una penalización`,
        timestamp: Date.now(),
        system: true
      });
    }

    if (gameLogic.checkGameOver(game)) {
      endGame(table);
      return;
    }

    activePlayer.isActive = false;
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    game.lastAction2Chosen = false;
    startTurn(table.id);
  }

  function endGame(table) {
    const game = table.game;
    if (!game || game.phase === 'gameover') return;
    game.phase = 'gameover';
    const results = game.players.map(p => ({
      id: p.id,
      username: p.username,
      score: gameLogic.getTotalScore(p),
      penalties: p.penalties,
      details: {
        red: p.filas.red.count,
        yellow: p.filas.yellow.count,
        green: p.filas.green.count,
        blue: p.filas.blue.count
      }
    }));
    results.sort((a, b) => b.score - a.score);
    io.to(`table:${table.id}`).emit('game_over', { results });
    // Update rankings via HTTP
    const http = require('http');
    const postData = JSON.stringify({ results: results.map(r => ({
      username: r.username,
      score: r.score,
      win: r.score === results[0].score
    })) });
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/rankings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = http.request(options);
    req.write(postData);
    req.end();
    table.status = 'finished';
  }
});

server.listen(PORT, () => {
  console.log(`Qwixx Online server running on http://localhost:${PORT}`);
});
