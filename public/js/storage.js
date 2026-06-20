// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const Storage = {
  get(key) {
    try { return localStorage.getItem(`qwixx_${key}`); }
    catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(`qwixx_${key}`, value); }
    catch { }
  },
  remove(key) {
    try { localStorage.removeItem(`qwixx_${key}`); }
    catch { }
  }
};
