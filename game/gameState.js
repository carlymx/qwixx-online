// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const crypto = require('crypto');

const tables = new Map();

function genId() {
  return crypto.randomBytes(4).toString('hex');
}

function createTable(name, hostId, hostName, password) {
  const id = genId();
  const table = {
    id,
    name,
    hostId,
    hostName,
    password: password || null,
    players: [{ id: hostId, username: hostName }],
    status: 'waiting',
    game: null
  };
  tables.set(id, table);
  return table;
}

function getTable(id) {
  return tables.get(id) || null;
}

function addPlayerToTable(tableId, playerId, username, password) {
  const table = tables.get(tableId);
  if (!table) return false;
  if (table.players.find(p => p.id === playerId)) return false;
  if (table.password && table.password !== password) return false;
  table.players.push({ id: playerId, username });
  return true;
}

function removePlayerFromTable(tableId, playerId) {
  const table = tables.get(tableId);
  if (!table) return false;
  const idx = table.players.findIndex(p => p.id === playerId);
  if (idx === -1) return false;
  table.players.splice(idx, 1);
  return true;
}

function removeTable(id) {
  tables.delete(id);
}

function listTables() {
  return Array.from(tables.values()).filter(t => t.status !== 'finished');
}

function startGame(tableId) {
  const table = tables.get(tableId);
  if (!table) return null;
  if (table.players.length < 1) return null;

  const players = table.players.map((p, i) => ({
    id: p.id,
    username: p.username,
    filas: {
      red: { marked: new Array(11).fill(false), locked: false, count: 0 },
      yellow: { marked: new Array(11).fill(false), locked: false, count: 0 },
      green: { marked: new Array(11).fill(false), locked: false, count: 0 },
      blue: { marked: new Array(11).fill(false), locked: false, count: 0 }
    },
    penalties: 0,
    isActive: false
  }));

  const dice = { white: [0, 0], red: null, yellow: null, green: null, blue: null };

  const game = {
    players,
    dice,
    phase: 'rolling',
    currentPlayerIndex: Math.floor(Math.random() * players.length),
    lockedRows: [],
    pendingChoices: {},
    turnTimer: null,
    lastAction2Chosen: false,
    startTime: Date.now()
  };

  table.game = game;
  table.status = 'playing';
  return game;
}

module.exports = { createTable, getTable, addPlayerToTable, removePlayerFromTable, removeTable, listTables, startGame };
