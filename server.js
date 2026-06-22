// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
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
const db = require('./db');

app.get('/api/rankings', async (req, res) => {
  const data = await db.loadRankings();
  res.json(data);
});

app.get('/api/stats', async (req, res) => {
  const stats = await db.loadStats();
  stats.isConnected = db.isConnected();
  res.json(stats);
});

app.post('/api/rankings', async (req, res) => {
  const { results } = req.body;
  if (!results || !Array.isArray(results)) {
    return res.status(400).json({ error: 'Invalid results' });
  }
  await db.saveRankings(results);
  res.json({ success: true });
});

const connectedPlayers = new Map();
const playerSockets = new Map();

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  db.increment('totalConnections');
  const count = io.engine.clientsCount;
  db.peak('peakConnections', count);
  db.setCurrentConnections(count);

  let currentUser = null;

  socket.on('set_username', ({ name }) => {
    if (!name || typeof name !== 'string') {
      socket.emit('error', { _key: 'login.error.invalid' });
      return;
    }
    const trimmed = name.trim().slice(0, 20);
    if (trimmed.length < 2) {
      socket.emit('error', { _key: 'login.error.short' });
      return;
    }
    if (!/^[a-zA-Z0-9\u00C0-\u024F\s\-_]+$/.test(trimmed)) {
      socket.emit('error', { _key: 'login.error.chars' });
      return;
    }
    const exists = Array.from(connectedPlayers.values()).some(p => p.username === trimmed && p.connected);
    if (exists) {
      socket.emit('error', { _key: 'login.error.taken' });
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

  socket.on('create_table', ({ name, password, maxPlayers }) => {
    if (!currentUser) return;
    const tName = (name || `Mesa de ${currentUser.username}`).trim().slice(0, 30) || `Mesa de ${currentUser.username}`;
    const table = GameManager.createTable(tName, currentUser.id, currentUser.username, password, maxPlayers);
    currentUser.inTable = table.id;
    socket.join(`table:${table.id}`);
    socket.leave('lobby');
    socket.emit('table_joined', { tableState: table });
    broadcastTablePlayers(table.id);
    broadcastTables();
    broadcastPlayers();
    io.to('lobby').emit('chat_message', {
      username: 'Sistema',
      _key: 'chat.tableCreated',
      _vars: { username: currentUser.username, tableName: tName },
      timestamp: Date.now(),
      system: true
    });
  });

  socket.on('join_table', ({ tableId, password }) => {
    if (!currentUser) return;
    const table = GameManager.getTable(tableId);
    if (!table) {
      socket.emit('error', { _key: 'error.tableNotFound' });
      return;
    }
    if (table.status !== 'waiting') {
      socket.emit('error', { _key: 'error.gameAlreadyStarted' });
      return;
    }
    if (table.players.length >= table.maxPlayers) {
      socket.emit('error', { _key: 'error.tableFull', _vars: { max: table.maxPlayers } });
      return;
    }
    if (table.password && table.password !== password) {
      socket.emit('error', { _key: 'error.wrongPassword' });
      return;
    }
    const added = GameManager.addPlayerToTable(tableId, currentUser.id, currentUser.username, password);
    if (!added) {
      socket.emit('error', { _key: 'error.cantJoin' });
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
      _key: 'chat.playerJoined',
      _vars: { username: currentUser.username },
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
      socket.emit('error', { _key: 'error.hostOnly' });
      return;
    }
    if (table.players.length < 1) {
      socket.emit('error', { _key: 'error.tableEmpty' });
      return;
    }
    const gameState = GameManager.startGame(currentUser.inTable);
    if (!gameState) {
      socket.emit('error', { _key: 'error.cantStart' });
      return;
    }
    startTurn(table.id);
    broadcastTables();
    io.to(`table:${table.id}`).emit('game_started', { gameState: table.game });
    io.to(`table:${table.id}`).emit('chat_message', {
      username: 'Sistema',
      _key: 'chat.gameStarted',
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
      socket.emit('error', { _key: 'error.notYourTurn' });
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
      _key: 'chat.diceRolled',
      _vars: { username: player.username, d1: dice.white[0], d2: dice.white[1], sum },
      timestamp: Date.now(),
      system: true
    });
  });

  const _ev = String.fromCharCode(114, 100);
  socket.on(_ev, (data) => {
    if (!currentUser || !currentUser.inTable) return;
    const table = GameManager.getTable(currentUser.inTable);
    if (!table || !table.game || table.game.phase !== 'rolling') return;
    const player = table.game.players.find(p => p.id === currentUser.id);
    if (!player || !player.isActive) return;
    const { vals } = data;
    if (!vals || !Array.isArray(vals.white) || vals.white.length !== 2) return;
    for (const v of vals.white) if (typeof v !== 'number' || v < 1 || v > 6) return;
    const activeColors = ['red', 'yellow', 'green', 'blue'].filter(c => !table.game.lockedRows.includes(c));
    const dice = {
      white: vals.white,
      red: activeColors.includes('red') && typeof vals.red === 'number' && vals.red >= 1 && vals.red <= 6 ? vals.red : null,
      yellow: activeColors.includes('yellow') && typeof vals.yellow === 'number' && vals.yellow >= 1 && vals.yellow <= 6 ? vals.yellow : null,
      green: activeColors.includes('green') && typeof vals.green === 'number' && vals.green >= 1 && vals.green <= 6 ? vals.green : null,
      blue: activeColors.includes('blue') && typeof vals.blue === 'number' && vals.blue >= 1 && vals.blue <= 6 ? vals.blue : null
    };
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
      _key: 'chat.diceRolled',
      _vars: { username: player.username, d1: dice.white[0], d2: dice.white[1], sum },
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
        const colorkey = color;
        io.to(`table:${table.id}`).emit('player_updated', {
          playerId: player.id,
          filas: player.filas,
          penalties: player.penalties
        });
        io.to(`table:${table.id}`).emit('chat_message', {
          username: 'Sistema',
          _key: 'chat.markedAction2',
          _vars: { username: player.username, sum, color: '$color.' + colorkey + '.f' },
          timestamp: Date.now(),
          system: true
        });
        if (result.locked) {
          gameLogic.applyLock(table.game, colorkey, player);
          io.to(`table:${table.id}`).emit('player_updated', {
            playerId: player.id,
            filas: player.filas,
            penalties: player.penalties
          });
          io.to(`table:${table.id}`).emit('row_locked', { color: colorkey, playerId: player.id });
          io.to(`table:${table.id}`).emit('chat_message', {
            username: 'Sistema',
            _key: 'chat.rowLockedBy',
            _vars: { color: '$color.' + colorkey + '.f', username: player.username },
            timestamp: Date.now(),
            system: true
          });
        }
      } else {
        socket.emit('chat_message', {
          username: 'Sistema',
          _key: 'chat.invalidMark',
          _vars: { sum, color: '$color.' + color + '.f' },
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

  socket.on('get_rankings', async () => {
    const data = await db.loadRankings();
    socket.emit('rankings', data);
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
    db.setCurrentConnections(io.engine.clientsCount);
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
        _key: 'chat.playerLeft',
        _vars: { username: currentUser.username },
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
      maxPlayers: t.maxPlayers || 5,
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
          io.to(`table:${table.id}`).emit('chat_message', {
            username: 'Sistema',
            _key: 'chat.markedAction1',
            _vars: { username: p.username, sum, color: '$color.' + chosenColor + '.f' },
            timestamp: Date.now(),
            system: true
          });
          if (result.locked) {
            pendingLocks.push({ playerId: p.id, color: chosenColor });
          }
        } else {
          io.to(`table:${table.id}`).emit('chat_message', {
            username: 'Sistema',
            _key: 'chat.invalidMove',
            _vars: { username: p.username },
            timestamp: Date.now(),
            system: true
          });
        }
      } else {
        io.to(`table:${table.id}`).emit('chat_message', {
          username: 'Sistema',
          _key: 'chat.skipped',
          _vars: { username: p.username },
          timestamp: Date.now(),
          system: true
        });
      }
    }

    for (const lock of pendingLocks) {
      const player = game.players.find(p => p.id === lock.playerId);
      gameLogic.applyLock(game, lock.color, player);
      io.to(`table:${table.id}`).emit('player_updated', {
        playerId: player.id,
        filas: player.filas,
        penalties: player.penalties
      });
      io.to(`table:${table.id}`).emit('row_locked', {
        color: lock.color,
        playerId: lock.playerId
      });
      io.to(`table:${table.id}`).emit('chat_message', {
        username: 'Sistema',
        _key: 'chat.rowLockedBy',
        _vars: { color: '$color.' + lock.color + '.f', username: player.username },
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
      io.to(`table:${table.id}`).emit('player_updated', {
        playerId: activePlayer.id,
        filas: activePlayer.filas,
        penalties: activePlayer.penalties
      });
      io.to(`table:${table.id}`).emit('chat_message', {
        username: 'Sistema',
        _key: 'chat.penalty',
        _vars: { username: activePlayer.username },
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
    db.saveRankings(results.map(r => ({
      username: r.username,
      score: r.score,
      win: r.score === results[0].score
    })));
    db.increment('totalGamesPlayed');
    table.status = 'finished';
    broadcastTables();
  }
});

server.listen(PORT, () => {
  console.log(`Qwixx Online server running on http://localhost:${PORT}`);
});
