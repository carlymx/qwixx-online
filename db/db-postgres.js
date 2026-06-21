// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const { Pool } = require('pg');

let pool;
let connected = false;

async function init() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rankings (
        username TEXT PRIMARY KEY,
        score INTEGER DEFAULT 0,
        games INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        last_played TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS server_stats (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_connections INTEGER DEFAULT 0,
        peak_connections INTEGER DEFAULT 0,
        current_connections INTEGER DEFAULT 0,
        total_games_played INTEGER DEFAULT 0,
        last_restart TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO server_stats (id, total_connections, peak_connections, current_connections, total_games_played, last_restart)
      VALUES (1, 0, 0, 0, 0, NOW())
      ON CONFLICT (id) DO UPDATE SET last_restart = NOW()
    `);
    connected = true;
    console.log('PostgreSQL connected successfully');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    connected = false;
  }
}

async function loadRankings() {
  const result = await pool.query('SELECT username, score, games, wins, last_played FROM rankings ORDER BY score DESC LIMIT 50');
  return { rankings: result.rows.map(r => ({
    username: r.username,
    score: r.score,
    games: r.games,
    wins: r.wins,
    lastPlayed: r.last_played
  })) };
}

async function saveRankings(results) {
  for (const r of results) {
    await pool.query(`
      INSERT INTO rankings (username, score, games, wins, last_played)
      VALUES ($1, $2, 1, $3, NOW())
      ON CONFLICT (username) DO UPDATE SET
        score = GREATEST(rankings.score, $2),
        games = rankings.games + 1,
        wins = rankings.wins + $3,
        last_played = NOW()
    `, [r.username, r.score || 0, r.win ? 1 : 0]);
  }
}

async function loadStats() {
  try {
    const result = await pool.query('SELECT * FROM server_stats WHERE id = 1');
    if (result.rows.length === 0) {
      return {
        totalConnections: 0,
        peakConnections: 0,
        currentConnections: 0,
        totalGamesPlayed: 0,
        lastRestart: new Date().toISOString()
      };
    }
    const row = result.rows[0];
    return {
      totalConnections: row.total_connections,
      peakConnections: row.peak_connections,
      currentConnections: row.current_connections,
      totalGamesPlayed: row.total_games_played,
      lastRestart: row.last_restart
    };
  } catch (err) {
    console.error('loadStats error:', err.message);
    return {
      totalConnections: 0,
      peakConnections: 0,
      currentConnections: 0,
      totalGamesPlayed: 0,
      lastRestart: new Date().toISOString()
    };
  }
}

async function increment(field) {
  const columnMap = {
    totalConnections: 'total_connections',
    totalGamesPlayed: 'total_games_played'
  };
  const col = columnMap[field];
  if (!col) return;
  try {
    await pool.query(`UPDATE server_stats SET ${col} = ${col} + 1 WHERE id = 1`);
  } catch (err) {
    console.error(`increment(${field}) error:`, err.message);
  }
}

async function peak(field, value) {
  if (field !== 'peakConnections') return;
  try {
    await pool.query('UPDATE server_stats SET peak_connections = GREATEST(peak_connections, $1) WHERE id = 1', [value]);
  } catch (err) {
    console.error('peak error:', err.message);
  }
}

async function setCurrentConnections(value) {
  try {
    await pool.query('UPDATE server_stats SET current_connections = $1 WHERE id = 1', [value]);
  } catch (err) {
    console.error('setCurrentConnections error:', err.message);
  }
}

function isConnected() {
  return connected;
}

module.exports = { init, loadRankings, saveRankings, loadStats, increment, peak, setCurrentConnections, isConnected };
