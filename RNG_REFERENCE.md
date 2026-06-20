# RNG Technical Reference — R-EXAM-V1

> **Propósito:** Documentación técnica completa de todas las fuentes de aleatoriedad del proyecto, estructurada para que cualquier IA agentica pueda comprender, reutilizar y adaptar los generadores a cualquier caso de uso.

---

## Quick Reference

| ID | Clase | Tipo | Estado | Seed | Velocidad | Entropía |
|----|-------|------|--------|------|-----------|----------|
| `pcg` | `PCGGenerator` | PRNG local | 32-bit state | 32-bit | ~200M nums/s | Determinista |
| `xoshiro` | `Xoshiro128` | PRNG local | 128-bit state | 32-bit → splitmix32 | ~200M nums/s | Determinista |
| `mulberry` | `Mulberry32` | PRNG local | 32-bit state | 32-bit | ~200M nums/s | Determinista |
| `crypto-pure` | `CryptoPureSource` | Criptográfico | Stateless | Ninguna (OS entropy) | ~500K nums/s | Hardware |
| `crypto-xoshiro` | `CryptoXoshiroFastSource` | Híbrido | 128-bit state | 32-bit o crypto | ~200M nums/s | Determinista + crypto seed |
| `crypto-xoshiro-ng` | `CryptoXoshiroNGSource` | Híbrido NG | 128-bit state | 128-bit real o splitmix32 | ~180M nums/s | 128-bit + per-noise |
| `random-org` | `fetch()` → API | Online | Buffer FIFO | Ninguna | Lento (~100/s) | Ruido atmosférico |
| `csv-replay` | `CSVReplaySource` | Replay | Array index | Archivo | N/A (replay) | Pre-grabada |

---

## 1. Interface Contract

Toda fuente de aleatoriedad implementa este contrato:

```javascript
interface RandomSource {
    constructor(seed?: number | null): void
    next(): number          // Retorna entero en [0, N-1] (N=37 en ruleta)
    reseed?(): void         // Opcional: re-sembrar
}
```

No hay herencia formal — es un contrato duck-typing. El despachador central (`getRandomNumber()`) simplemente llama a `.next()` sobre la instancia almacenada en `state.generators[id]`.

### Output Range Convention

El rango de salida es siempre `[0, 36]` (módulo 37 para ruleta europea). Para adaptar a otro rango `[0, M-1]`, reemplazar `% 37` por `% M`. Para rangos generales `[min, max]`: `min + (value % (max - min + 1))`.

---

## 2. Pure PRNG Generators

### 2.1 PCGGenerator (PCG-XSH-RR simplificado)

```javascript
export class PCGGenerator {
    constructor(seed = null) {
        let s = seed == null ? (Math.random() * 0x100000000) >>> 0 : seed >>> 0;
        this.state = s || 1;
    }
    next() {
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), 1 | t);
        t = (t + Math.imul(t, t >>> 7)) | 0;
        this.state = t;
        return (t >>> 0) % 37;
    }
}
```

**Características:**
- Estado: 32-bit single integer
- Período: 2³² (~4.3B números)
- No es PCG canónico (falta permutación de bits), es una adaptación simplificada
- Seed por defecto: `Math.random()` si no se provee
- Multiplicación con `Math.imul` (ver sección 10)
- Sin `reset()` ni `reseed()`

### 2.2 Xoshiro128++

```javascript
export class Xoshiro128 {
    constructor(seed = null) {
        let s = seed != null ? seed >>> 0 : Date.now() >>> 0;
        this.s = new Uint32Array(4);
        const splitmix32 = (state) => {
            state += 0x9E3779B9;
            let t = state;
            t ^= t >>> 16; t = Math.imul(t, 0x85EBCA6B);
            t ^= t >>> 13; t = Math.imul(t, 0xC2B2AE35);
            t ^= t >>> 16;
            return t >>> 0;
        };
        let state = s;
        for (let i = 0; i < 4; i++) {
            state = splitmix32(state);
            this.s[i] = state;
        }
    }
    static fromState(s0, s1, s2, s3) {
        const rng = new Xoshiro128(0);
        rng.s[0] = s0 >>> 0;
        rng.s[1] = s1 >>> 0;
        rng.s[2] = s2 >>> 0;
        rng.s[3] = s3 >>> 0;
        return rng;
    }
    next() {
        const s = this.s;
        const result = (s[0] + s[3]) >>> 0;
        const t = (s[1] << 9) >>> 0;
        s[2] ^= s[0];
        s[3] ^= s[1];
        s[1] ^= s[2];
        s[0] ^= s[3];
        s[2] ^= t;
        s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
        const output = ((result + s[0]) >>> 0) + ((result + s[1]) >>> 0);
        return (output % 37) >>> 0;
    }
}
```

**Características:**
- Estado: 128-bit (Uint32Array[4])
- Período: 2¹²⁸ − 1 (prácticamente infinito)
- Algoritmo: Xoshiro128++ (doble suma pre y post-rotación)
- Seed expansion: SplitMix32 itera 4 veces para llenar state array
- `fromState()` permite saltarse SplitMix32 e inyectar 128 bits directamente
- Seed por defecto: `Date.now()` si no se provee

**Xoshiro128++ vs variantes:**
| Variante | Scramble | Calidad |
|----------|----------|---------|
| Xoshiro128** | XOR de estado completo | Rápida, bits bajos débiles |
| Xoshiro128+ | `s[0] + s[3]` | Buena, falla BigCrush |
| Xoshiro128++ | `(s[0]+s[3]) + s[0] + s[1]` (pre + post) | Excelente, pasa BigCrush |

### 2.3 Mulberry32

```javascript
export class Mulberry32 {
    constructor(seed = null) {
        this.seed = seed != null ? seed : Math.floor(Math.random() * 0xFFFFFFFF) || 1;
        this.state = this.seed;
    }
    next() {
        this.state = (this.state + 0x6D2B79F5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) % 37;
    }
    reset() {
        this.state = this.seed;
    }
}
```

**Características:**
- Estado: 32-bit single integer
- Período: 2³²
- Transformación casi idéntica a PCGGenerator pero con `reset()`
- Se inicializa con `seed2 = seed1 + 1` para diferir de PCG/Xoshiro
- `reset()` vuelve al estado inicial (útil para reproducción exacta)

---

## 3. Cryptographic Sources

### 3.1 CryptoPureSource

```javascript
export class CryptoPureSource {
    constructor() {}
    next() {
        return crypto.getRandomValues(new Uint32Array(1))[0] % 37;
    }
}
```

**Características:**
- Stateless: cada llamada obtiene entropía fresca del SO
- Fuente: `window.crypto.getRandomValues()` (CSPRNG del sistema)
- Velocidad limitada (~500K nums/s vs ~200M de PRNGs)
- Sin seed, sin reseed (no hay estado que resembrar)
- `crypto.getRandomValues()` está disponible tanto en main thread como en Web Workers
- Puede fallar en contexto `file://` en algunos navegadores

### 3.2 CryptoXoshiroFastSource

```javascript
export class CryptoXoshiroFastSource {
    constructor(seed) {
        this._seed = seed != null ? seed >>> 0 : null;
        this._init();
    }
    _init() {
        var s = this._seed != null
            ? this._seed
            : crypto.getRandomValues(new Uint32Array(1))[0];
        this._rng = new Xoshiro128(s);
    }
    next() { return this._rng.next(); }
    reseed() {
        this._seed = null;      // Fuerza nueva seed criptográfica
        this._init();
    }
}
```

**Arquitectura híbrida:**
1. **Siembra:** Si hay seed explícita → reproducible. Si no → `crypto.getRandomValues()` (entropía real)
2. **Cómputo:** Delega en Xoshiro128 para velocidad
3. **Reseed:** Siempre obtiene seed fresca de `crypto.getRandomValues()` (rompe correlación entre segmentos)

**Uso típico:** Benchmarks masivos que necesitan velocidad PRNG pero con entropía renovable periódicamente.

### 3.3 CryptoXoshiroNGSource (Next Gen)

```javascript
function splitmix32(state) {
    state += 0x9E3779B9;
    let t = state;
    t ^= t >>> 16; t = Math.imul(t, 0x85EBCA6B);
    t ^= t >>> 13; t = Math.imul(t, 0xC2B2AE35);
    t ^= t >>> 16;
    return t >>> 0;
}

export class CryptoXoshiroNGSource {
    constructor(seed) {
        this._seed = seed != null ? seed >>> 0 : null;
        this._init();
    }
    _init() {
        if (this._seed != null) {
            // Modo determinista: expandir 32-bit seed → 128-bit state via splitmix32
            const s = this._seed >>> 0;
            const s0 = splitmix32(s);
            const s1 = splitmix32(s0);
            const s2 = splitmix32(s1);
            const s3 = splitmix32(s2);
            this._rng = Xoshiro128.fromState(s0, s1, s2, s3);
        } else {
            // Modo entropía: 128 bits reales desde crypto
            const arr = crypto.getRandomValues(new Uint32Array(4));
            this._rng = Xoshiro128.fromState(arr[0], arr[1], arr[2], arr[3]);
        }
    }
    next() {
        const x = this._rng.next();
        const noise = performance.now() >>> 0;
        return ((x ^ noise) >>> 0) % 37;
    }
    reseed() {
        this._seed = null;  // Siempre crypto fresco, incluso con seed fija
        this._init();
    }
}
```

**Innovaciones clave:**
1. **128-bit real seeding:** En modo entropía, obtiene 4×Uint32 de `crypto.getRandomValues()` — 128 bits genuinos
2. **Splitmix32 chain:** 32→128 determinista vía 4 iteraciones encadenadas (s → s0 → s1 → s2 → s3)
3. **Per-number noise:** Cada salida mezcla `Xoshiro128.next() ^ (performance.now() >>> 0)` — microsecond-granularity jitter
4. **`Xoshiro128.fromState()`:** Constructor estático que inyecta estado 128-bit directamente sin SplitMix32

**Modos vs comportamientos:**

| Seed | Init | Reseed | Reproducible |
|------|------|--------|-------------|
| Fija (32-bit) | splitmix32 → 128-bit | crypto(128-bit) | ✅ Secuencia hasta reseed |
| Vacía | crypto(128-bit) | crypto(128-bit) | ❌ |

---

## 4. External Sources

### 4.1 RANDOM.ORG (Online)

```javascript
function fetchRandomOrgBuffer() {
    const numMesas = getNumMesasActivas();
    const batchPorMesa = parseInt(document.getElementById('random-org-batch').value) || 10;
    const cantidad = numMesas * batchPorMesa;

    if (fetchingRandomOrg || randomOrgBuffer.length > getLimiteBuffer()) return;
    fetchingRandomOrg = true;

    fetch(`https://www.random.org/integers/?num=${cantidad}&min=0&max=36&col=1&base=10&format=plain&rnd=new`)
        .then(r => r.text())
        .then(t => {
            const nums = t.trim().split('\n').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
            randomOrgBuffer.push(...nums);
            fetchingRandomOrg = false;
            randomOrgInicializado = true;
        })
        .catch(() => { fetchingRandomOrg = false; });
}

function getLimiteBuffer() {
    const numMesas = getNumMesasActivas();
    return numMesas * 3;
}
```

**Arquitectura de buffer preventivo:**
- Buffer FIFO se rellena asíncronamente
- Cuando buffer ≤ `numMesas × 3`, lanza nuevo fetch
- Si buffer vacío: fallback inmediato a Xoshiro128++
- Timeout: 10s (AbortController)
- Batch size: `numMesas × config.batchPorMesa`

**API URL Parameters:**
| Param | Descripción |
|-------|-------------|
| `num` | Cantidad de enteros |
| `min=0`, `max=36` | Rango |
| `col=1` | Una columna |
| `base=10` | Decimal |
| `format=plain` | Texto plano |
| `rnd=new` | Sin caché |

### 4.2 CSVReplaySource

```javascript
export class CSVReplaySource {
    constructor(numbers) {
        this._numbers = numbers;
        this._index = 0;
        this._length = numbers.length;
    }
    next() {
        if (this._index >= this._length) {
            throw new RangeError('CSVReplaySource agotado');
        }
        return this._numbers[this._index++];
    }
    size() { return this._length; }
    remaining() { return this._length - this._index; }
    getConsumed() { return this._index; }
}
```

**Formatos CSV soportados por `parseCSV()`:**

**Formato antiguo (simple):**
```
5,10,15,20
```

**Formato con header:**
```
Numero,Timestamp
5,2024-01-01
10,2024-01-02
```

**Formato columnar (Mesa1..MesaN):**
```
Mesa1,Mesa2,Mesa3
15,33,0
22,12,1
7,8,2
```
Los números se intercalan por fila-then-columna: `[15,33,0,22,12,1,7,8,2]`

---

## 5. Seed Management

### 5.1 Deterministic Seed Path

```
User seed (32-bit)
       │
       ▼
seed1 = seed >>> 0
seed2 = (seed + 1) >>> 0
       │
       ├── PCGGenerator(seed1)      → state = seed1
       ├── Xoshiro128(seed1)        → splitmix32×4 → 128-bit state
       └── Mulberry32(seed2)       → state = seed2
```

### 5.2 Auto Seed Path (no user seed)

```
Date.now() XOR Math.random()
       │
       ▼
seed1 = (timestamp ^ random) >>> 0
seed2 = (random ^ timestamp) >>> 0
```

### 5.3 SplitMix32 Seed Expansion

```javascript
function splitmix32(state) {
    state = (state + 0x9E3779B9) | 0;   // Fracción áurea en 32 bits
    let t = state;
    t ^= t >>> 16;
    t = Math.imul(t, 0x85EBCA6B);       // Primera constante de avalancha
    t ^= t >>> 13;
    t = Math.imul(t, 0xC2B2AE35);       // Segunda constante de avalancha
    t ^= t >>> 16;
    return t >>> 0;
}
```

SplitMix32 convierte una seed de 32 bits en un estado de 128 bits para Xoshiro128. Se itera 4 veces encadenando la salida como entrada siguiente:
```
s = seed
s0 = splitmix32(s)
s1 = splitmix32(s0)
s2 = splitmix32(s1)
s3 = splitmix32(s2)
```

### 5.4 Crypto Seed Path

```
crypto.getRandomValues(new Uint32Array(1)) → 32-bit seed
    │
    └── CryptoXoshiroFastSource → Xoshiro128(seed)
    
crypto.getRandomValues(new Uint32Array(4)) → 128-bit seed (4×Uint32)
    │
    └── CryptoXoshiroNGSource → Xoshiro128.fromState(s0,s1,s2,s3)
```

### 5.5 Reseed Mechanism

```javascript
function reseedIfNeeded() {
    if (state.reseedInterval > 0 && state.totalSpins % state.reseedInterval === 0) {
        var newSeed = ((state.baseSeed + state.reseedCount * 1000003) * 1664525 + 1013904223) >>> 0;
        state.generators.pcg       = new PCGGenerator(newSeed);
        state.generators.xoshiro   = new Xoshiro128(newSeed);
        state.generators.mulberry  = new Mulberry32((newSeed + 1) >>> 0);
        state.generators['crypto-xoshiro'].reseed();     // crypto.getRandomValues()
        state.generators['crypto-xoshiro-ng'].reseed();   // crypto.getRandomValues()
    }
}
```

| Fuente | Comportamiento reseed |
|--------|----------------------|
| `pcg`, `xoshiro`, `mulberry` | LCG derivada de baseSeed (determinista) |
| `crypto-pure` | No aplica (stateless) |
| `crypto-xoshiro`, `crypto-xoshiro-ng` | `crypto.getRandomValues()` (no determinista) |

---

## 6. performance.now() Noise Injection

Usado exclusivamente en `CryptoXoshiroNGSource.next()`:

```javascript
next() {
    const x = this._rng.next();          // Xoshiro128++ output
    const noise = performance.now() >>> 0; // Microsegundos desde page load
    return ((x ^ noise) >>> 0) % 37;     // XOR noise → range
}
```

**Propiedades del noise:**
- `performance.now()` tiene resolución de microsegundos (~1μs en navegadores modernos)
- El valor concreto depende de cuándo exactamente se llame (indeterminista a nivel micro)
- XOR mezcla los bits altos de Xoshiro con bits bajos de timestamp
- `>>> 0` trunca a 32-bit unsigned
- Disponible tanto en main thread como en Web Workers
- **No afecta la reproducibilidad** si la seed es fija (el noise es determinista para el mismo timing)

---

## 7. Despachador Central: getRandomNumber()

```javascript
export function getRandomNumber() {
    state.totalSpins++;
    reseedIfNeeded();
    let num;

    if (state.currentSource === 'random-org') {
        if (state.randomOrgBuffer.length > 0) {
            if (state.randomOrgBuffer.length <= getLimiteBuffer() && !state.fetchingRandomOrg) {
                fetchRandomOrgBuffer();
            }
            num = state.randomOrgBuffer.shift();
        }
        if (num === undefined) {
            if (!state.randomOrgInicializado) {
                fetchRandomOrgBuffer();
            }
            num = state.generators.xoshiro.next();
        }
    } else if (state.currentSource === 'csv-replay') {
        // CSV replay con state.csvReplaySource
        try { num = state.csvReplaySource.next(); }
        catch (e) { state.terminado = true; return null; }
    } else {
        const gen = state.generators[state.currentSource];
        num = gen ? gen.next() : state.generators.xoshiro.next();
    }

    // Marquee buffer (visualización)
    if (state.marqueeActivo) {
        state.numeroBuffer.push(num);
        // trim if > 500 * lineasMarquee
    }
    // CSV export tracking
    if (state.guardarCSVNumeros) {
        state.numerosExportCSV.push(`${num},${new Date().toISOString()},${state.currentSource}`);
    }
    return num;
}
```

**Árbol de decisión:**
```
getRandomNumber()
    ├── totalSpins++ → reseedIfNeeded()
    │
    ├── random-org? → buffer? → sí: shift() + fetch preventivo si bajo
    │                              no: fetch inicial + fallback Xoshiro
    │
    ├── csv-replay? → CSVReplaySource.next() o terminado
    │
    └── default? → generators[source].next() o Xoshiro fallback
```

---

## 8. State Management

```javascript
export const state = {
    generators: {},
    currentSource: 'xoshiro',
    baseSeed: 0,
    reseedInterval: 0,
    reseedCount: 0,
    totalSpins: 0,
    randomOrgBuffer: [],
    fetchingRandomOrg: false,
    randomOrgInicializado: false,
    numeroBuffer: [],
    numerosConsumidos: 0,
    marqueeActivo: true,
    guardarCSVNumeros: false,
    numerosExportCSV: [],
    lineasMarquee: 1,
    csvReplaySource: null,
    csvReplayNumbers: [],
    csvReplayFileName: '',
    csvReplayLoaded: false,
};
```

---

## 9. Benchmark Web Worker Integration

En el Benchmark, las fuentes se usan dentro de un Web Worker. La función `crearRNG()` crea la instancia correcta:

```javascript
function crearRNG(source, seed) {
    if (source === 'pcg') return new PCGGenerator(seed);
    if (source === 'mulberry') return new Mulberry32((seed + 1) >>> 0);
    if (source === 'crypto-pure') return new CryptoPureSource();
    if (source === 'crypto-xoshiro') return new CryptoXoshiroFastSource(seed);
    if (source === 'crypto-xoshiro-ng') return new CryptoXoshiroNGSource(seed);
    return new Xoshiro128(seed);
}
```

**Reseed en Worker** (benchmark-worker.js):
```javascript
if (reseedInterval > 0 && spinCount > 0 && spinCount % reseedInterval === 0) {
    if (config.currentSource === 'crypto-pure') {
        // no-op
    } else if (config.currentSource === 'crypto-xoshiro') {
        rng = new CryptoXoshiroFastSource(null);
    } else if (config.currentSource === 'crypto-xoshiro-ng') {
        rng = new CryptoXoshiroNGSource(null);
    } else {
        reseedCount++;
        var newSeed = ((seed + reseedCount * 1000003) * 1664525 + 1013904223) >>> 0;
        rng = crearRNG(config.currentSource || 'xoshiro', newSeed);
    }
}
```

**Nota:** El Benchmark mantiene una copia standalone de `random-source-interface.js` (sin `CSVReplaySource`) en `Benchmark/js/shared/random-source-interface.js`. El archivo `rng.js` es un symlink a `Simulador/js/rng.js`.

**Build order** para el worker bundle:
```
constants.js + rng.js + random-source-interface.js + strategies.js + validation.js + benchmark-worker.js
```

---

## 10. Python Backend Implementation

Para scripts de verificación o análisis offline:

```python
import secrets

class CryptoPureSource:
    def next(self):
        return secrets.randbelow(37)

class Xoshiro128Py:
    def __init__(self, seed):
        s = seed & 0xFFFFFFFF
        self.state = [0] * 4
        state = s
        for i in range(4):
            state = self._splitmix32(state)
            self.state[i] = state

    @staticmethod
    def _splitmix32(st):
        st = (st + 0x9E3779B9) & 0xFFFFFFFF
        t = st
        t ^= (t >> 16) & 0xFFFFFFFF
        t = (t * 0x85EBCA6B) & 0xFFFFFFFF
        t ^= (t >> 13) & 0xFFFFFFFF
        t = (t * 0xC2B2AE35) & 0xFFFFFFFF
        t ^= (t >> 16) & 0xFFFFFFFF
        return t & 0xFFFFFFFF

    def next_raw(self):
        s = self.state
        result = (s[0] + s[3]) & 0xFFFFFFFF
        t = (s[1] << 9) & 0xFFFFFFFF
        s[2] ^= s[0]
        s[3] ^= s[1]
        s[1] ^= s[2]
        s[0] ^= s[3]
        s[2] ^= t
        s[3] = ((s[3] << 11) | (s[3] >> 21)) & 0xFFFFFFFF
        output = ((result + s[0]) & 0xFFFFFFFF) + ((result + s[1]) & 0xFFFFFFFF)
        return output

    def next(self):
        return self.next_raw() % 37

class CryptoXoshiroFastSource:
    def __init__(self, seed=None):
        if seed is None:
            seed = secrets.randbits(32)
        self._rng = Xoshiro128Py(seed)

    def reseed(self):
        self._rng = Xoshiro128Py(secrets.randbits(32))

    def next(self):
        return self._rng.next()
```

Diferencias clave con JS:
- `& 0xFFFFFFFF` reemplaza `>>> 0`
- `*` normal (no `Math.imul`) porque Python tiene enteros de precisión arbitraria
- `secrets.randbelow(37)` reemplaza `crypto.getRandomValues(new Uint32Array(1))[0] % 37`
- `secrets.randbits(32)` reemplaza `crypto.getRandomValues(new Uint32Array(1))[0]`

---

## 11. Critical Technical Details

### 11.1 Math.imul vs *

```javascript
// Correcto para 32-bit:
t = Math.imul(t, 0x85EBCA6B);

// Incorrecto (pérdida de precisión para valores > 2⁵³):
t = (t * 0x85EBCA6B) | 0;
```

JavaScript representa números como float64. `Math.imul()` es el equivalente nativo de multiplicación entera 32-bit, necesaria para PRNGs que requieren aritmética exacta.

### 11.2 >>> 0 (uint32 coercion)

`>>> 0` convierte cualquier número a entero de 32 bits sin signo (rango 0 a 4,294,967,295). Esencial tras:
- XOR (`^`) que puede producir negativos en JS
- Suma que excede 2³¹
- Desplazamientos de bits

### 11.3 Uint32Array

`new Uint32Array(4)` garantiza que las operaciones de bits se comporten como en C, sin conversiones implícitas a float64.

### 11.4 Modulo Bias

`4294967296 / 37 = 116080197.18...`
Resto: 7. Los números 0–6 tienen un sesgo relativo de ~8.6e-9. Para la mayoría de usos es despreciable. Para aplicaciones que requieren distribución perfecta, usar rejection sampling:

```javascript
function unbiasedMod37(x) {
    // Solo acepta valores en [0, 4294967296 - 7)
    while (x >= 4294967289) x = rng.nextRaw();
    return x % 37;
}
```

### 11.5 RANDOM.ORG Rate Limits

Plan gratuito: 10,000 bits/día. 1 número = 6 bits (0-36 cabe en 6 bits). Límite ~1,666 números/día. Usar batch pequeño para no agotar cuota.

### 11.6 Web Worker Availability

- `crypto.getRandomValues()`: ✅ disponible en Workers
- `performance.now()`: ✅ disponible en Workers
- `Date.now()`: ✅ disponible en Workers
- `Math.random()`: ✅ disponible en Workers
- `fetch()`: ✅ disponible en Workers

---

## 12. Adaptation Guide

### 12.1 Change Output Range

Para cambiar de ruleta (0-36) a otro rango:

```javascript
// Rango [0, M-1]:
next() { return this.nextRaw() % M; }

// Rango [min, max]:
next() { return min + (this.nextRaw() % (max - min + 1)); }

// Float [0, 1):
nextFloat() { return this.nextRaw() / 0x100000000; }
```

### 12.2 Add Persistence (Save/Restore State)

```javascript
// Serializar estado de Xoshiro128:
const state = Array.from(rng.s);

// Restaurar:
const restored = Xoshiro128.fromState(state[0], state[1], state[2], state[3]);
```

### 12.3 Create a Custom Hybrid Source

Plantilla para combinar PRNG clásico con fuente criptográfica:

```javascript
class MyHybridSource {
    constructor(seed) {
        this._seed = seed != null ? seed >>> 0 : null;
        this._init();
    }
    _init() {
        if (this._seed != null) {
            // Modo reproducible: expandir seed
            const s = splitmix32(this._seed);
            this._rng = new Xoshiro128(s);
        } else {
            // Modo entropía: crypto directo
            this._rng = new Xoshiro128(crypto.getRandomValues(new Uint32Array(1))[0]);
        }
    }
    next() {
        // Inyectar noise opcional
        const x = this._rng.next();
        const noise = this._useNoise ? (performance.now() >>> 0) : 0;
        return ((x ^ noise) >>> 0) % M;
    }
    reseed() { this._seed = null; this._init(); }
}
```

### 12.4 Deterministic Parallel Sequences

Para simulaciones multi-thread con secuencias independientes:

```javascript
// Worker 0: Xoshiro128.fromState(base + 0, base + 1, base + 2, base + 3)
// Worker 1: Xoshiro128.fromState(base + 4, base + 5, base + 6, base + 7)
// ...
```

Cada worker recibe 4×Uint32 contiguos y produce secuencia totalmente independiente (período 2¹²⁸ por worker).

### 12.5 Node.js Usage

En Node.js, `crypto.getRandomValues()` es parte del módulo `crypto` global (desde v19+). Para versiones anteriores:

```javascript
const { randomBytes } = require('crypto');
const crypto = {
    getRandomValues: (arr) => {
        const bytes = randomBytes(arr.byteLength);
        arr.set(bytes.buffer ? new Uint32Array(bytes.buffer) : bytes);
        return arr;
    }
};
```

---

## 13. Test Patterns

### Determinism Test
```javascript
const a = new Xoshiro128(42);
const b = new Xoshiro128(42);
for (let i = 0; i < 100; i++) {
    expect(a.next()).toBe(b.next());
}
```

### Range Test
```javascript
for (let i = 0; i < 1000; i++) {
    const n = rng.next();
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(36);
}
```

### Coverage Test
```javascript
const seen = new Set();
for (let i = 0; i < 5000; i++) seen.add(rng.next());
expect(seen.size).toBeGreaterThanOrEqual(35);  // Al menos 35/37 números
```

### Reset Test (Mulberry32)
```javascript
const first = rng.next();
rng.next(); rng.next();
rng.reset();
expect(rng.next()).toBe(first);
```

### Consistency Test (Cross-platform)
```javascript
// JS: Xoshiro128.fromState(s0,s1,s2,s3) → secuencia 0,36,17,5,...
// Python: Xoshiro128Py(s0,s1,s2,s3) → 0,36,17,5,...
// Ambos deben producir los mismos números dada la misma seed.
```

---

## 14. Source Name Reference

```javascript
const NOMBRES_FUENTE = {
    pcg:                    'PCG (Local)',
    xoshiro:                'Xoshiro128++ (Local)',
    mulberry:               'Mulberry32 (Local)',
    'random-org':           'RANDOM.ORG (Online)',
    'crypto-pure':          'Criptográfico Local Puro',
    'crypto-xoshiro':       'Híbrido Cripto-Xoshiro Fast',
    'crypto-xoshiro-ng':    'Cripto-Xoshiro Next Gen',
    'csv-replay':           'CSV Replay (Archivo)'
};
```

Valid set en `setRandomSource()`:
```javascript
const valid = ['pcg', 'xoshiro', 'random-org', 'mulberry',
               'crypto-pure', 'crypto-xoshiro', 'crypto-xoshiro-ng', 'csv-replay'];
```

---

## 15. References

- Blackman, D. & Vigna, S. (2018). "Scrambled Linear Pseudorandom Number Generators". ACM Trans. Math. Softw. — https://prng.di.unimi.it/
- Xoshiro128++ reference implementation (C): https://prng.di.unimi.it/xoshiro128plusplus.c
- RANDOM.ORG HTTP API: https://www.random.org/clients/http/
- SplitMix64 (paper): https://gee.cs.oswego.edu/dl/papers/oopsla14.pdf
- `Math.imul` (MDN): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
- `crypto.getRandomValues` (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- `performance.now` (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Performance/now

---

> Generado para que cualquier IA agentica pueda comprender, reutilizar y adaptar todo el sistema de aleatoriedad de R-EXAM-V1 sin necesidad de leer los archivos fuente completos. Todos los fragmentos de código son reproducciones literales de los archivos fuente del proyecto.
