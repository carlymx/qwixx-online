# Changelog

> **Formato:** [Keep a Changelog](https://keepachangelog.com/)
> **Versiones:** [SemVer](https://semver.org/)

## [0.8.0] — 2026-06-20

### Añadido

- Sección 3.6 de bloqueo reescrita con narrativa completa (condiciones, valores exactos, estrategia)
- 6 marcadores de captura de pantalla en la ayuda (`/imgs/cap/cap001.png`–`cap006.png`)

### Cambiado

- **Cartón SVG**: candados divididos en `circle_{color}`, `unlock_{color}` y `lock_{color}` (cerrado). El candado se cierra visualmente al bloquear la fila.
- **Acción 2**: botones inválidos ahora aparecen deshabilitados (`.disabled`) — no se puede pulsar una suma que no sea el siguiente número válido.
- **Servidor**: elección inválida en Acción 2 ya no cae en `finishTurn`; se mantiene en fase action2 con un nuevo timer de 60s y mensaje de error.
- **Lock `lastIndex`**: corregido de `color === 'red' || color === 'yellow' ? 10 : 0` a `10` para todos los colores (verde/azul usaban índice 0 → valor 12 en vez de índice 10 → valor 2).
- Versión actualizada de v0.2.5 a v0.8.0.
- Fecha actualizada a 2026-06-20.

## [0.2.5] — 2026-06-19

### Añadido

#### Infraestructura
- Servidor Node.js con Express + Socket.IO para comunicación en tiempo real
- Motor de reglas Qwixx completo con validaciones server-side (direccionalidad, exclusividad de acciones, penalizaciones, bloqueos)
- Generación de números aleatorios criptográficamente segura (`crypto.randomBytes()` de Node.js) — adaptación de CryptoPureSource
- Gestión de partidas en RAM con soporte para múltiples mesas simultáneas
- Persistencia de ranking global en `data/rankings.json`

#### Cliente — Interfaz de Usuario
- **Login:** Entrada de nombre único con validación en servidor y persistencia en localStorage
- **Lobby:** Lista de jugadores conectados en tiempo real, mesas activas con estado, ranking global y chat
- **Juego:**
  - Cartón propio interactivo con números tachables, efecto pulsante en seleccionables y candado visual
  - Cartones ajenos esquemáticos con barras de progreso por fila
  - Dados con animación 3D y caras Unicode (⚀⚁⚂⚃⚄⚅)
  - Tabla de puntuaciones en tiempo real
  - Timer de 60s con advertencia visual en últimos 10s
  - Modal de resultados con desglose detallado
- **Tema claro/oscuro:** Implementación Material Design con 50+ variables CSS y persistencia en localStorage
- **Sonido:** Efectos mediante Web Audio API sin archivos externos (tirada de dados, tachar número, bloqueo de fila, fin de partida)
- **Diseño responsive:** Adaptación a móvil con layout vertical < 900px

#### Documentación
- `docs/index.html`: Página de ayuda completa con sidebar navegable estilo ReadTheDocs, scroll tracking, callouts informativos, tabla de puntuación y explicación del sistema RNG
- `PLAN.md`: Plan de implementación detallado con 16 secciones

#### Mecánicas de Juego
- Ciclo completo de turno: tirada de dados → Acción 1 (todos los jugadores) → Acción 2 (solo activo) → penalización → cambio de turno
- Implementación fiel de todas las reglas del reglamento de referencia:
  - Direccionalidad obligatoria con bloqueo permanente de números omitidos
  - Exclusividad de Acción 1 (un jugador, una fila)
  - Exclusividad de Acción 2 (solo activo)
  - Penalización si activo no tacha nada
  - Bloqueo de filas con candado y requisito de ≥5 tachados
  - Bloqueo simultáneo durante Acción 1
  - Fin de juego por 4 penalizaciones o 2 filas bloqueadas
  - Puntuación con fórmula `n·(n+1)/2`
- Dados retirados del juego al bloquear una fila
- Timeout automático (60s) para evitar partidas bloqueadas
- Manejo de desconexiones con finalización de partida

### Técnico
- 17 archivos creados
- Servidor: ~540 líneas con 16 eventos Socket.IO (cliente→servidor) y 15 eventos (servidor→cliente)
- Cliente: SPA con 3 vistas intercambiables (login/lobby/game)
- CSS: ~650 líneas con sistema de tokens, temas y animaciones
- Socket.IO v4 + Express v4 — sin dependencias externas adicionales

[0.8.0]: https://github.com/anomalyco/opencode/releases/tag/v0.8.0
[0.2.5]: https://github.com/anomalyco/opencode/releases/tag/v0.2.5
