// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const crypto = require('crypto');

class CryptoPureSource {
  nextInt(min, max) {
    const range = max - min + 1;
    const bytes = crypto.randomBytes(4);
    const value = bytes.readUInt32BE(0);
    return min + (value % range);
  }

  rollDice(activeColors) {
    const white = [this.nextInt(1, 6), this.nextInt(1, 6)];
    const dice = { white };
    const colors = ['red', 'yellow', 'green', 'blue'];
    for (const color of colors) {
      dice[color] = activeColors.includes(color) ? this.nextInt(1, 6) : null;
    }
    return dice;
  }
}

module.exports = new CryptoPureSource();
