[Read in English →](README.md)

![qwixx-online](/public/imgs/0001.png)

# Qwixx Online

Implementación multijugador del juego de dados **Qwixx** usando HTML5/CSS/JS, Node.js y Socket.IO.

## Características

- Multijugador en tiempo real con Socket.IO
- Modo solitario (mínimo 1 jugador por mesa)
- Mesas protegidas con contraseña
- Tema claro/oscuro con persistencia
- Efectos de sonido via Web Audio API
- Tableros SVG renderizados en el cliente
- RNG criptográficamente seguro del lado del servidor
- Chat integrado (sala & por partida)
- Sistema de ranking ELO

## Cómo ejecutar

```bash
npm install
npm start
```

Abrir `http://localhost:3000`.

## Reglas del juego

Cada jugador tiene cuatro filas de colores (rojo, amarillo, verde, azul). En cada turno:

1. El jugador activo tira cuatro dados (dos blancos + dos de color).
2. **Acción 1**: Sumar los dos dados blancos — cualquier jugador puede marcar ese número en cualquier fila de color.
3. **Acción 2**: El jugador activo elige un dado blanco + un dado de color y marca esa suma en la fila del color correspondiente.
4. Los números se marcan de izquierda a derecha (ascendente para rojo/amarillo, descendente para verde/azul).
5. Si un jugador no puede o no quiere marcar, recibe un penal (−5 puntos, máximo 4 penales).
6. Una fila se bloquea cuando tiene 5+ números marcados y el dado de color correspondiente muestra su valor final.
7. La partida termina cuando al menos 2 filas están bloqueadas o un jugador acumula 4 penales. Gana el que más puntos tiene.

Puntuación: `n × (n+1) / 2` por fila (donde n = números marcados), menos penales.

## Stack tecnológico

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JS, SVG, Web Audio API
- **RNG**: `crypto.randomBytes()` de Node.js — solo servidor, nunca expuesto al cliente

## Changelog

### v0.8.0 — 2026-06-20
- Corregida detección de bloqueo en filas verde/azul (usaba valor 12 en vez de 2)
- Candados SVG ahora muestran estado abierto/cerrado según bloqueo de fila
- Botones de Acción 2 deshabilitan sumas inválidas (no se puede pulsar un número ya pasado)
- Servidor ya no penaliza al jugador que elige una combinación inválida en Acción 2
- Añadidos marcadores de captura en la documentación (`/imgs/cap/cap001.png`–`cap006.png`)
- Narrativa completa de bloqueo en sección 3.6 de la ayuda

### v0.2.5 — 2026-06-19
- Lanzamiento inicial: reglas Qwixx completas, tablero SVG, multijugador via Socket.IO

