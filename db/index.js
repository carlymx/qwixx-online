// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const jsonAdapter = require('./db-json');
let activeAdapter = jsonAdapter;

if (process.env.DATABASE_URL) {
  const pgAdapter = require('./db-postgres');
  pgAdapter.init().then(() => {
    if (pgAdapter.isConnected()) {
      activeAdapter = pgAdapter;
      console.log('Using PostgreSQL storage');
    } else {
      console.log('PostgreSQL unavailable, falling back to JSON storage');
    }
  });
}

module.exports = {
  loadRankings: (...args) => activeAdapter.loadRankings(...args),
  saveRankings: (...args) => activeAdapter.saveRankings(...args),
  loadStats: (...args) => activeAdapter.loadStats(...args),
  increment: (...args) => activeAdapter.increment(...args),
  peak: (...args) => activeAdapter.peak(...args),
  setCurrentConnections: (...args) => activeAdapter.setCurrentConnections(...args),
  isConnected: () => activeAdapter.isConnected()
};
