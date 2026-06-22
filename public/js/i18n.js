// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const I18N = {
  _locale: null,
  _lang: 'es',
  _langs: ['es', 'en'],

  init() {
    const saved = Storage.get('lang');
    const detected = this._detect();
    this._lang = saved || detected;
    Storage.set('lang', this._lang);
    document.documentElement.lang = this._lang;
    this._load();
  },

  _detect() {
    const browser = (navigator.language || '').toLowerCase().split('-')[0];
    if (this._langs.includes(browser)) return browser;
    return 'es';
  },

  async _load() {
    try {
      const res = await fetch(`/locales/${this._lang}.json?${VERSION}`);
      this._locale = await res.json();
    } catch (e) {
      this._locale = null;
    }
    document.documentElement.lang = this._lang;
    this._applyDataAttrs();
    document.dispatchEvent(new CustomEvent('langloaded'));
  },

  _applyDataAttrs() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key) el.textContent = I18N.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (key) el.placeholder = I18N.t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (key) el.title = I18N.t(key);
    });
  },

  t(key, vars) {
    let str = (this._locale && this._locale[key]) ? this._locale[key] : key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        const escaped = String(vars[k]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), escaped);
      }
    }
    return str;
  },

  async setLang(lang) {
    this._lang = lang;
    Storage.set('lang', lang);
    await this._load();
    document.dispatchEvent(new CustomEvent('langchanged'));
  },

  _showLangMenu() {
    const existing = document.getElementById('lang-menu');
    if (existing) {
      existing.remove();
      return;
    }

    const menu = document.createElement('div');
    menu.id = 'lang-menu';
    Object.assign(menu.style, {
      position: 'fixed',
      background: 'var(--bg-secondary, #1e1e2e)',
      border: '1px solid var(--border-color, #333)',
      borderRadius: '6px',
      padding: '4px 0',
      zIndex: '9999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      minWidth: '70px'
    });

    for (const code of this._langs) {
      const item = document.createElement('div');
      item.textContent = code.toUpperCase();
      Object.assign(item.style, {
        padding: '6px 14px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: code === this._lang ? '600' : '400',
        color: code === this._lang ? 'var(--accent-color, #c084fc)' : 'var(--text-primary)',
        background: code === this._lang ? 'var(--bg-tertiary, rgba(192,132,252,0.1))' : 'transparent'
      });
      item.addEventListener('click', () => {
        menu.remove();
        if (code !== this._lang) this.setLang(code);
      });
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--bg-tertiary, rgba(255,255,255,0.05))';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = code === this._lang ? 'var(--bg-tertiary, rgba(192,132,252,0.1))' : 'transparent';
      });
      menu.appendChild(item);
    }

    document.body.appendChild(menu);
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && !e.target.closest('[id^="btn-lang"]')) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }
};

function t(key, vars) { return I18N.t(key, vars); }

I18N.init();

document.addEventListener('click', e => {
  const btn = e.target.closest('[id^="btn-lang"]');
  if (btn) {
    e.stopPropagation();
    I18N._showLangMenu();
    const rect = btn.getBoundingClientRect();
    const menu = document.getElementById('lang-menu');
    if (menu) {
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.left = (rect.right - 70) + 'px';
    }
  }
});
