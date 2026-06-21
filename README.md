[Leer en español →](README_ES.md)

![qwixx-online](/public/imgs/0001.png)

# Qwixx Online

A full-stack multiplayer implementation of the dice game **Qwixx** using HTML5/CSS/JS, Node.js, and Socket.IO.

## Features

- Real-time multiplayer with Socket.IO
- Solo play (minimum 1 player per table)
- Password-protected tables
- Dark/light theme with persistence
- Sound effects via Web Audio API
- SVG game boards rendered client-side
- Server-side cryptographically secure RNG
- Built-in chat (lobby & per-game)
- ELO ranking system

## How to Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Game Rules

Each player has four color rows (red, yellow, green, blue). On each turn:

1. The active player rolls four dice (two white + two colored).
2. **Action 1**: Sum the two white dice — any player may mark that number in any color row.
3. **Action 2**: The active player chooses one white die + one colored die and marks that sum in the corresponding color row.
4. Numbers must be marked left-to-right (ascending for red/yellow, descending for green/blue).
5. If a player can't or won't mark, they take a penalty (−5 points per penalty, max 4 penalties).
6. A row locks when 5+ numbers are marked in that row and the corresponding colored die shows its final value.
7. The game ends when at least 2 rows are locked or a player accumulates 4 penalties. Highest score wins.

Scoring: `n × (n+1) / 2` per row (where n = marked numbers), minus penalties.

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JS, SVG, Web Audio API
- **RNG**: Node.js `crypto.randomBytes()` — server-side, never exposed to client

## Changelog

### v0.9.2 — 2026-06-21
- Fixed row lock: lock now counts as an extra mark (+1 to score) and shows an X overlay on the lock icon
- Version bumped to v0.9.2

### v0.9.0 — 2026-06-21
- Server stats panel in lobby (connections, peak, games played, uptime)
- Storage adapter: PostgreSQL with JSON fallback, selected via `DATABASE_URL`
- Max players selector (1-5) when creating a table
- Rankings and stats persisted in PostgreSQL when available
- Red/green indicator showing database connection status
- `.gitignore` updated: `data/rankings.json`, `data/stats.json`, `render_db.txt`

### v0.8.8 — 2026-06-21
- Ranking now only updates score if the new score is higher
- Leave game now shows a confirmation modal
- Help button added to game view topbar

### v0.8.7 — 2026-06-21
- Penalty warning banner in Action 2 if the active player didn't mark anything in Action 1
- Colored dice now show Unicode faces (like white dice), enlarged to 52px

### v0.8.6 — 2026-06-21
- Table chat now shows each player's Action 1 choices (who marked what, who passed)
- Action 1 last cell no longer shows as selectable with less than 5 marks (matches server validation)

### v0.8.5 — 2026-06-21
- Fixed `canMark` requirement from 4 to 5 to match lock condition (`count >= 5`)
- Numbers on SVG board are now clickable (not just the panel behind them)
- Status text now updates immediately after Action 1 choice

### v0.8.0 — 2026-06-20
- Fixed lock detection for green/blue rows (was checking value 12 instead of 2)
- SVG locks now show open/closed state based on row lock status
- Action 2 buttons now disable invalid sums (can't click a number that's already past)
- Server no longer penalizes players who make an invalid Action 2 choice
- Added screenshot placeholders in documentation (`/imgs/cap/cap001.png`–`cap006.png`)
- Full lock mechanic narrative in docs section 3.6

### v0.2.5 — 2026-06-19
- Initial release: full Qwixx rules, SVG board, multiplayer via Socket.IO

