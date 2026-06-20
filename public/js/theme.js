// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const Theme = {
  init() {
    const saved = Storage.get('theme') || 'dark';
    this.set(saved);
    const btn = document.getElementById('btn-theme');
    if (btn) btn.addEventListener('click', () => this.toggle());
    const btnGame = document.getElementById('btn-theme-game');
    if (btnGame) btnGame.addEventListener('click', () => this.toggle());
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.set('theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    const iconGame = document.getElementById('theme-icon-game');
    if (iconGame) iconGame.textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.set(current === 'dark' ? 'light' : 'dark');
  }
};
