# Auditoría de Código — Qwixx Online v0.8.0

> **Fecha:** 2026-06-20
> **Propósito:** Revisión de seguridad, bugs, código muerto y calidad antes de subir a GitHub.

---

## 🐛 Bugs

| # | Archivo:línea | Hallazgo | Severidad |
|---|---------------|----------|-----------|
| 1 | `public/js/game.js:207` | Progreso usa `/12` pero las filas tienen 11 valores. Máximo 91.6% | BAJA |
| 2 | `public/js/app.js:208` | `getElementById('game-over-modal')` no encuentra nada (el modal no tiene ID). El modal no se limpia al volver al lobby. | MEDIA |
| 3 | `public/js/game.js:164` | `setTimeout(0)` para attach de eventos — frágil, el botón podría no existir aún. | BAJA |
| 4 | `public/js/game.js:418-434` | `startTimer()` crea `setInterval` pero nunca lo limpia entre rondas. Se acumulan timers. | BAJA |
| 5 | `server.js:564` | `require('http')` duplicado (también en línea 6). | MUY BAJA |
| 6 | `public/index.html` | Falta etiqueta `</head>` (navegadores lo toleran). | MUY BAJA |

## 🔒 Seguridad (contexto LAN)

| # | Archivo:línea | Hallazgo | Dañino en LAN? | Severidad |
|---|---------------|----------|----------------|-----------|
| 7 | `public/index.html:157` | CDN `cdn.socket.io` — sin Internet la app no arranca en absoluto | SÍ — app inusable sin conexión | **ALTA** |
| 8 | `server.js:42-68` | `/api/rankings` POST sin autenticación. Cualquiera en la LAN puede manipular puntuaciones. | Potencial — usuarios maliciosos en LAN | BAJA |
| 9 | `server.js:573-575` | Auto-HTTP a rankings sin manejo de errores (`req.on('error')`). | No — error silencioso, no bloquea | MUY BAJA |

## 🧹 Código Muerto / Duplicado

| # | Archivo:línea | Hallazgo | Severidad |
|---|---------------|----------|-----------|
| 10 | `server.js:564` | `require('http')` redundante (ya requerido en línea 6) | MUY BAJA |
| 11 | `public/js/game.js` + `server.js` | Arrays `ROW_VALUES` duplicados en 3 sitios (servidor, game.js ×2) | BAJA |
| 12 | `public/js/game.js:442-451` | `calculateScore` / `getTotalScore` copiadas del servidor | BAJA |

## ⚠️ Observaciones (mejorable, no bugs)

| # | Archivo:línea | Hallazgo |
|---|---------------|----------|
| 13 | Varios | Traducciones de colores (`{ red: 'Roja' }`) repetidas inline en vez de constante |
| 14 | `server.js:244,498` | `timerSeconds = 60` como literal duplicado |
| 15 | `public/css/styles.css:352` | Colores de badges sin usar variables CSS |
| 16 | `public/js/game.js:114-148` | `getBoundingClientRect()` en bucle (layout thrashing) |
| 17 | `public/js/game.js:88-106` | Optimistic update local sin esperar confirmación del servidor |

## ✅ Hallazgos del análisis automatizado que son INCORRECTOS

1. **"count >= 5 debería ser count >= 4"** — FALSO. El PDF oficial dice "primero debes haber tachado al menos **cinco** números". Con 5 marcas previas (`count >= 5`) más la última son 6 totales. La implementación es correcta.

2. **"Penalización debería aplicarse aunque haya marcado en Acción 1"** — FALSO. El PDF dice "si tras las dos acciones el activo **no ha tachado al menos un número**". Si marcó en Acción 1, ya tachó al menos uno. El código es correcto.

## 🎯 Resumen

| Severidad | Cantidad |
|-----------|----------|
| ALTA | 1 |
| MEDIA | 1 |
| BAJA | 8 |
| MUY BAJA | 7 |

**El único problema crítico** (#7): dependencia del CDN de Socket.IO. Para uso en LAN sin Internet, hay que servir `socket.io.min.js` desde el propio servidor.
