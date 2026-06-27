// Qwixx Online - multiplayer dice game
// Copyright (c) 2026 carlymx
// SPDX-License-Identifier: GPL-3.0-only

const Chat = {
  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

function createChat(containerId, inputId, sendId) {
  const input = document.getElementById(inputId);
  const send = document.getElementById(sendId);
  const container = document.getElementById(containerId);

  function sendMessage() {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    App.socket.emit('chat_message', { text });
    input.value = '';
  }

  function addMessage(msg) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = `chat-msg${msg.system ? ' system' : ''}`;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (msg.system) {
      const text = msg._key ? t(msg._key, resolveVars(msg._vars)) : msg.text;
      el.textContent = text;
    } else {
      el.innerHTML = `<span class="chat-time">${time}</span><span class="chat-user">${Chat.escape(msg.username)}</span>: ${Chat.escape(msg.text)}`;
    }
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;

    if (!msg.system && App._pageFocused === false) {
      Audio.playNotification();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Qwixx Online', { body: `${msg.username}: ${msg.text}`, icon: '/favicon.ico' });
      }
    }
  }

  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
  if (send) send.addEventListener('click', sendMessage);

  return { addMessage };
}

function resolveVars(vars) {
  if (!vars) return {};
  const resolved = {};
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === 'string' && v.startsWith('$')) {
      resolved[k] = t(v.slice(1));
    } else {
      resolved[k] = v;
    }
  }
  return resolved;
}
