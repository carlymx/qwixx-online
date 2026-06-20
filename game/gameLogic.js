// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const ROW_VALUES = {
  red: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  yellow: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  green: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  blue: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
};

function getNextNumber(marked, color) {
  const values = ROW_VALUES[color];
  if (!values) return null;
  for (let i = 0; i < 11; i++) {
    if (!marked[i]) return values[i];
  }
  return null;
}

function getMarkedCount(marked) {
  return marked.filter(Boolean).length;
}

function getLastMarkedIndex(marked) {
  let idx = -1;
  for (let i = 0; i < 11; i++) {
    if (marked[i]) idx = i;
  }
  return idx;
}

function canMark(fila, color, number) {
  if (fila.locked) return false;
  const values = ROW_VALUES[color];
  const numIdx = values.indexOf(number);
  if (numIdx === -1) return false;
  if (numIdx === 10 && getMarkedCount(fila.marked) < 4) return false;
  return numIdx > getLastMarkedIndex(fila.marked);
}

function validateAction1(player, color, sum) {
  const fila = player.filas[color];
  if (!fila) return { valid: false };
  if (!canMark(fila, color, sum)) return { valid: false };

  const values = ROW_VALUES[color];
  const lastIndex = 10;
  const count = getMarkedCount(fila.marked);
  const isLast = sum === values[lastIndex];
  const locked = isLast && count >= 5;

  return { valid: true, locked };
}

function validateAction2(player, color, sum) {
  const fila = player.filas[color];
  if (!fila) return { valid: false };
  if (!canMark(fila, color, sum)) return { valid: false };

  const values = ROW_VALUES[color];
  const lastIndex = 10;
  const count = getMarkedCount(fila.marked);
  const isLast = sum === values[lastIndex];
  const locked = isLast && count >= 5;

  return { valid: true, locked };
}

function applyMark(player, color, number) {
  const fila = player.filas[color];
  const values = ROW_VALUES[color];
  const idx = values.indexOf(number);
  if (idx !== -1 && !fila.marked[idx]) {
    fila.marked[idx] = true;
    fila.count = getMarkedCount(fila.marked);
  }
}

function applyLock(game, color) {
  if (!game.lockedRows.includes(color)) {
    game.lockedRows.push(color);
    for (const p of game.players) {
      p.filas[color].locked = true;
    }
  }
}

function applyPenalty(player) {
  if (player.penalties < 4) {
    player.penalties++;
  }
}

function checkGameOver(game) {
  for (const p of game.players) {
    if (p.penalties >= 4) return true;
  }
  return game.lockedRows.length >= 2;
}

function calculateScore(fila) {
  const n = fila ? fila.count : 0;
  return (n * (n + 1)) / 2;
}

function getTotalScore(player) {
  const rowScores = Object.values(player.filas).map(calculateScore).reduce((a, b) => a + b, 0);
  return rowScores - (player.penalties * 5);
}

module.exports = {
  validateAction1,
  validateAction2,
  canMark,
  getNextNumber,
  getMarkedCount,
  applyMark,
  applyLock,
  applyPenalty,
  checkGameOver,
  calculateScore,
  getTotalScore,
  ROW_VALUES
};
