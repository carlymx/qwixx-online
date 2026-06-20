[Leer en español →](README_ES.md)

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

### v0.8.0 — 2026-06-20
- Fixed lock detection for green/blue rows (was checking value 12 instead of 2)
- SVG locks now show open/closed state based on row lock status
- Action 2 buttons now disable invalid sums (can't click a number that's already past)
- Server no longer penalizes players who make an invalid Action 2 choice
- Added screenshot placeholders in documentation (`/imgs/cap/cap001.png`–`cap006.png`)
- Full lock mechanic narrative in docs section 3.6

### v0.2.5 — 2026-06-19
- Initial release: full Qwixx rules, SVG board, multiplayer via Socket.IO

