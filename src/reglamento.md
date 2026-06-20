Aquí tienes el reglamento de **QWIXX** estructurado y compilado en formato Markdown, diseñado específicamente como **base de conocimiento para un Agente de IA**. 

Está organizado en variables de estado, invariantes (restricciones), flujos lógicos y casos borde, para que cualquier modelo de lenguaje o sistema de programación pueda interpretar las reglas sin ambigüedades y desarrollar la versión online.

***

# 🎲 QWIXX: Reglamento para Agente IA (Versión Online)

## 1. Visión General y Objetivo
* **Jugadores**: 2 a 5.
* **Objetivo**: Maximizar la puntuación tachando números en 4 filas de colores, gestionando el riesgo de bloquear filas y evitar penalizaciones.
* **Componentes Virtuales**:
  * 6 Dados: 2 dados base (blancos/morados), 1 rojo, 1 verde, 1 azul, 1 amarillo.
  * 1 Hoja de puntuación por jugador (4 filas de colores, 4 casillas de penalización).

---

## 2. Estado del Juego (Game State)
La IA debe mantener y actualizar las siguientes variables globales y por jugador:

### Variables Globales
* `dados_base`: [dado1, dado2] (Rango 1-6)
* `dados_color`: {rojo: 1-6, verde: 1-6, azul: 1-6, amarillo: 1-6}
* `dados_activos`: Lista de colores de dados que aún no han sido bloqueados.
* `jugador_activo`: ID del jugador que tira los dados.
* `filas_bloqueadas`: Contador de filas bloqueadas (0, 1, 2, 3).
* `juego_terminado`: Booleano.

### Variables por Jugador
* `filas`:
  * `roja`: Números del 2 al 12 (Izquierda a Derecha).
  * `amarilla`: Números del 2 al 12 (Izquierda a Derecha).
  * `verde`: Números del 12 al 2 (Derecha a Izquierda).
  * `azul`: Números del 12 al 2 (Derecha a Izquierda).
* `penalizaciones`: Entero (0 a 4).
* `puntuacion_total`: Entero.

---

## 3. Restricciones Fundamentales (Invariants)
⚠️ **La IA debe validar estas reglas antes de permitir cualquier movimiento:**

1. **Regla de Direccionalidad (Obligatoria)**: Los números en cada fila **solo** pueden tacharse en orden secuencial.
   * *Roja/Amarilla*: 2 → 3 → 4 ... → 12.
   * *Verde/Azul*: 12 → 11 → 10 ... → 2.
   * *Salto*: Si un jugador decide no tachar un número intermedio, ese número (y todos los anteriores omitidos) quedan **permanentemente bloqueados** para ese jugador en esa fila.
2. **Exclusividad de Acción 1**: En la Acción 1, un jugador solo puede tachar el número resultante en **una única fila** de su elección.
3. **Exclusividad de Acción 2**: Solo el `jugador_activo` puede realizar la Acción 2.
4. **Fila Bloqueada**: Si una fila tiene el `candado` tachado, **ningún jugador** (incluido el activo) puede tachar más números en esa fila. El dado de ese color se considera "retirado" para futuras tiradas.

---

## 4. Flujo del Juego (Turn Loop)

### Fase 0: Inicio de la Partida
1. Cada jugador tira los dados en secreto o en orden hasta que alguien saca un **6** en cualquiera de los dados.
2. Ese jugador se convierte en el `jugador_activo` inicial.

### Fase 1: Tirada de Dados
El `jugador_activo` tira los 6 dados (o los que estén activos si hay filas bloqueadas).

### Fase 2: Acción 1 (Suma de Dados Base)
1. **Cálculo**: `suma = dados_base[0] + dados_base[1]`. (Rango posible: 2 a 12).
2. **Ejecución**: **TODOS** los jugadores (incluido el activo) evalúan si pueden tachar el número `suma`.
3. **Validación de Movimiento**: Un jugador puede tachar `suma` en una fila de color SI:
   * La fila no está bloqueada.
   * `suma` es el **siguiente número válido** en la secuencia de esa fila para ese jugador.
4. **Resolución**: Cada jugador elige *una* fila (o ninguna). La IA registra las elecciones de todos simultáneamente.

### Fase 3: Acción 2 (Suma Base + Color)
1. **Cálculo**: `suma = dado_base (1 o 2) + dado_color (rojo, verde, azul o amarillo)`.
2. **Ejecución**: **SOLO** el `jugador_activo` puede realizar esta acción.
3. **Validación de Movimiento**: El activo puede tachar `suma` en la fila del `dado_color` elegido SI:
   * La fila no está bloqueada.
   * `suma` es el **siguiente número válido** en la secuencia.
4. **Resolución**: El jugador activo elige una combinación (Base1+Color, Base2+Color) y fila, o decide no tachar nada.

### Fase 4: Resolución de Penalizaciones
1. **Condición**: Si el `jugador_activo` **NO** tachó ningún número en la Acción 1 **Y** **NO** tachó ningún número en la Acción 2.
2. **Efecto**: El jugador activo debe tachar una casilla de penalización (`penalizaciones += 1`).
3. *Nota*: Los jugadores inactivos NO reciben penalización si deciden no tachar nada en la Acción 1.

### Fase 5: Fin de Ronda
1. El turno pasa al jugador a la izquierda (`jugador_activo = siguiente_jugador()`).
2. Se repite desde la **Fase 1**.

---

## 5. Mecánica de Bloqueo de Filas (Locking)
Esta es una mecánica crítica que la IA debe manejar con precisión:

1. **Condición de Bloqueo**: El último número de una fila (12 en Roja/Amarilla; 2 en Verde/Azul) **solo** puede tacharse si el jugador ya ha tachado **al menos 5 números** en esa fila.
2. **Efecto Inmediato**: Al tachar el último número, el jugador **debe** tachar el icono del candado 🔒.
3. **Consecuencias Globales**:
   * La fila se bloquea para **todos** los jugadores.
   * El dado de ese color se retira del juego (la IA deja de generarlo en la Fase 1).
4. **Bloqueo Simultáneo (Caso Borde)**: Si el bloqueo ocurre durante la **Acción 1**, y otros jugadores también tienen tachados 5 números en esa misma fila, **ellos también pueden tachar el último número y el candado** en ese mismo turno.

---

## 6. Condición de Fin de Juego (Game Over)
La IA debe evaluar el `juego_terminado` al final de cada turno (o durante la Acción 1 si hay bloqueos simultáneos). El juego termina **inmediatamente** si ocurre CUALQUIERA de estos dos casos:

1. **Límite de Penalizaciones**: Algún jugador alcanza **4 penalizaciones**.
2. **Límite de Dados Retirados**: Se han bloqueado **2 filas de color** (2 dados retirados).
   * *Excepción Simultánea*: Si durante la Acción 1 se bloquea la 2ª fila, y otro jugador bloquea la 3ª fila en esa misma acción, el juego termina inmediatamente tras resolver la Acción 1.

---

## 7. Sistema de Puntuación (Scoring)
Al finalizar la partida, la IA debe calcular el puntaje usando la siguiente tabla (Números Triangulares). 

**Fórmula matemática para la IA**: `Puntos = (n * (n + 1)) / 2`, donde `n` es la cantidad de números tachados en la fila (incluyendo el candado si está bloqueada).

| Números tachados (n) | Puntos por fila |
| :---: | :---: |
| 1 | 1 |
| 2 | 3 |
| 3 | 6 |
| 4 | 10 |
| 5 | 15 |
| 6 | 21 |
| 7 | 28 |
| 8 | 36 |
| 9 | 45 |
| 10 | 55 |
| 11 | 66 |
| 12 | 78 |

**Cálculo Final**:
`Puntuación_Total = Suma(Puntos de las 4 filas) - (penalizaciones * 5)`
*El jugador con la mayor `Puntuación_Total` gana. En caso de empate, se puede declarar empate o usar un desempate (no especificado en reglas base, la IA puede permitir empate).*

---

## 8. Notas de Implementación para la IA (Edge Cases & UX)

1. **Sugerencia de Interfaz (UX)**: Dado que los números omitidos no pueden tacharse, la UI debe mostrar visualmente los números "saltados" como tachados con una línea suave o bloqueados en gris, para evitar que el usuario intente seleccionarlos por error.
2. **Validación de "Siguiente Número"**: 
   * Si un jugador tiene tachados `[2, 3, 4]` en Roja, su siguiente número válido es `5`. Si la suma de los dados es `6`, la IA **no** debe permitir tachar el `6` en la fila Roja para ese jugador.
3. **Manejo de la Acción 2**: La IA debe presentar al jugador activo las combinaciones posibles. Ejemplo: Si los dados base son `4` y `1`, y el dado azul es `6`, las opciones válidas para el activo son `(4+6=10 en Azul)` o `(1+6=7 en Azul)`.
4. **Anuncio de Bloqueo**: Si un jugador bloquea una fila, la IA debe generar un mensaje de sistema/alerta global: *"¡La fila [Color] ha sido bloqueada por [Jugador]!"*.
5. **Dados Retirados**: Si la fila Verde está bloqueada, el dado Verde ya no se tira. La IA solo debe generar 5 dados en la Fase 1 (2 base, rojo, azul, amarillo). Esto aumenta la probabilidad de que los dados base sumen números específicos, alterando la estrategia.
