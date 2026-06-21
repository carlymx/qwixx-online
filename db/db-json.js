// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '..', 'data', 'rankings.json');
const statsPath = path.join(__dirname, '..', 'data', 'stats.json');

function loadRankingsSync() {
  try {
    return JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
  } catch {
    return { rankings: [] };
  }
}

function saveRankingsSync(data) {
  fs.writeFileSync(rankingsPath, JSON.stringify(data, null, 2));
}

let stats;

function initStats() {
  try {
    stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  } catch {
    stats = {
      totalConnections: 0,
      peakConnections: 0,
      currentConnections: 0,
      totalGamesPlayed: 0,
      lastRestart: new Date().toISOString()
    };
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  }
}

function saveStatsSync(s) {
  stats = s;
  fs.writeFileSync(statsPath, JSON.stringify(s, null, 2));
}

initStats();

async function loadRankings() {
  return loadRankingsSync();
}

async function saveRankings(results) {
  const data = loadRankingsSync();
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
  saveRankingsSync(data);
}

async function loadStats() {
  return { ...stats };
}

async function increment(field) {
  if (stats[field] !== undefined) {
    stats[field]++;
    saveStatsSync(stats);
  }
}

async function peak(field, value) {
  if (value > (stats[field] || 0)) {
    stats[field] = value;
    saveStatsSync(stats);
  }
}

async function setCurrentConnections(value) {
  stats.currentConnections = value;
  saveStatsSync(stats);
}

function isConnected() {
  return false;
}

module.exports = { loadRankings, saveRankings, loadStats, increment, peak, setCurrentConnections, isConnected };
