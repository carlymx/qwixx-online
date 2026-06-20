# Documentación Auto-contenida — Guía de Arquitectura para IA Agenticas

> **Propósito:** Explicar cómo están estructuradas las páginas de ayuda de R-EXAM-V1 (estilo ReadTheDocs) para que cualquier IA agentica pueda replicar este mismo patrón en cualquier otro proyecto, generando documentación auto-contenida, navegable y preparada para capturas de pantalla.

---

## 1. Arquitectura General

Cada página de ayuda es un **HTML standalone** que incluye todo lo necesario: estructura, navegación, estilos y contenido. No depende de frameworks ni generadores estáticos.

### Estructura de archivos

```
docs/
├── index.html          # Manual en español
├── en.html             # Manual en inglés
├── docs.css            # Estilos específicos de documentación
├── img/                # Capturas de pantalla (0001.png, 0002.png, ...)
└── RNG_REFERENCE.md    # Documentación técnica para IAs
```

### Layout General

```
┌──────────────────────────────────────────────────┐
│  Top bar: Logo | [spacer] | ES/EN | 🌙           │
├──────────┬───────────────────────────────────────┤
│ Sidebar  │  Content area                         │
│ (fixed)  │                                       │
│          │  Section 1: ──────────────────        │
│ • 1. Intro│  Narrative text...                    │
│   • 1.1   │                                       │
│   • 1.2   │  <figure>                            │
│ • 2. Config│    <img src="img/0001.png">         │
│   • 2.1   │    <figcaption>...</figcaption>       │
│   • 2.2   │  </figure>                           │
│   • 2.2.1 │                                       │
│ • 3. ...  │  More narrative...                    │
│          │                                       │
│          │  Footer ──────────────────────         │
│          │  R-EXAM-V1 v1.19.0 — 2026-06-20       │
└──────────┴───────────────────────────────────────┘
```

---

## 2. Estructura HTML (Plantilla Base)

```html
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proyecto — Manual de Usuario</title>
    <link rel="icon" type="image/x-icon" href="../assets/favicon.ico">
    <link rel="stylesheet" href="../css/styles.css">   <!-- Estilos globales -->
    <link rel="stylesheet" href="docs.css">             <!-- Estilos de documentación -->
</head>
<body>

<!-- ═══ TOP BAR ═══ -->
<div class="docs-topbar">
    <a href="../index.html" class="logo">PROYECTO <small>Manual de usuario</small></a>
    <div class="spacer"></div>
    <div class="lang-switch">                          <!-- Opcional: multi-idioma -->
        <a href="index.html" class="active">ES</a>
        <a href="en.html">EN</a>
    </div>
    <button id="btn-tema" class="btn-tema" title="Cambiar tema">
        <span id="icono-tema">🌙</span>
    </button>
</div>

<!-- ═══ WRAPPER (sidebar + content) ═══ -->
<div class="docs-wrapper">

<!-- ═══ SIDEBAR ═══ -->
<aside class="docs-sidebar">
<nav>
<ul>
    <li class="section-title">Proyecto</li>
    <li><a href="#intro">1. Introducción</a></li>
    <li class="sub"><a href="#intro-que-es">1.1 Qué es</a></li>
    <li class="sub"><a href="#intro-requisitos">1.2 Requisitos</a></li>

    <li class="section-title">Configuración</li>
    <li><a href="#config">2. Panel de Configuración</a></li>
    <li class="sub"><a href="#config-seccion1">2.1 Sección 1</a></li>
    <li class="subsub"><a href="#config-subseccion">2.1.1 Subsección</a></li>

    <!-- ... más secciones ... -->

    <li class="section-title">Referencia</li>
    <li><a href="#apendice">9. Apéndice</a></li>
</ul>
</nav>
</aside>

<!-- ═══ CONTENIDO ═══ -->
<main class="docs-content">

<!-- ════════════════════════════════════════════ -->
<!-- 1. SECCIÓN PRINCIPAL -->
<!-- ════════════════════════════════════════════ -->
<section id="intro">
<h1>Manual de Usuario — Proyecto</h1>
<p class="subtitle">Descripción · v0.8.0</p>

<div class="callout warning">                       <!-- Callout opcional -->
    <div class="callout-title">⚠️ Aviso importante</div>
    <p>Texto de advertencia...</p>
</div>
</section>

<!-- FIGURA: espacio preconfigurado para captura -->
<figure class="docs-figure">
    <img src="img/0001.png" alt="Descripción breve" loading="lazy">
    <figcaption>Descripción detallada de la captura</figcaption>
</figure>

<section id="intro-que-es">
<h3>1.1 Qué es</h3>
<p>Texto narrativo...</p>
</section>

<!-- FIGURA: otra captura -->
<figure class="docs-figure">
    <img src="img/0002.png" alt="..." loading="lazy">
    <figcaption>...</figcaption>
</figure>

<!-- ════════════════════════════════════════════ -->
<!-- 2. SIGUIENTE SECCIÓN -->
<!-- ════════════════════════════════════════════ -->
<section id="config">
<h2>2. Panel de Configuración</h2>
<p>Texto introductorio de la sección...</p>
</section>

<!-- ... más contenido ... -->

<!-- ═══ FOOTER ═══ -->
<footer class="docs-footer">
    PROYECTO v0.8.0 — 2026-06-20
</footer>

</main>
</div>

<script>
// Theme toggle (opcional)
document.getElementById('btn-tema')?.addEventListener('click', function() {
    const html = document.documentElement;
    const theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});

// Active sidebar scroll tracking (opcional)
// ...
</script>
</body>
</html>
```

---

## 3. Sistema de Navegación (Sidebar estilo ReadTheDocs)

### 3.1 Jerarquía de niveles

```html
<li class="section-title">Título de Sección</li>    <!-- Encabezado de grupo -->
<li><a href="#id">1. Sección Principal</a></li>      <!-- Nivel 1: h2 -->
<li class="sub"><a href="#id">1.1 Subsección</a></li>    <!-- Nivel 2: h3 -->
<li class="subsub"><a href="#id">1.1.1 Detalle</a></li>  <!-- Nivel 3: h4 -->
```

**Reglas:**
- `section-title`: mayúsculas, espaciado, sin link
- `li` normal: padding 24px, `h2` en content
- `li.sub`: padding 36px, `h3` en content
- `li.subsub`: padding 52px, `h4` en content
- El `href` apunta al `id` del `section` o encabezado correspondiente

### 3.2 Scroll activo (opcional)

```javascript
// Resalta el enlace de la sección visible actualmente
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            document.querySelectorAll('.docs-sidebar a').forEach(a => a.classList.remove('active'));
            const link = document.querySelector(`.docs-sidebar a[href="#${entry.target.id}"]`);
            if (link) link.classList.add('active');
        }
    });
}, { rootMargin: '-80px 0px -60% 0px' });

document.querySelectorAll('section[id]').forEach(s => observer.observe(s));
```

---

## 4. Narrativa: Estructura Punto por Punto

### 4.1 Patrón de sección

Cada sección sigue esta estructura:

```
┌─────────────────────────────────────────┐
│  <!-- ═══ DELIMITADOR ═══ -->           │
│  <section id="id-unico">                │
│      <h2>N. Título</h2>                 │  ← Contexto general
│      <p>Párrafo introductorio...</p>     │
│  </section>                              │
│                                          │
│  <figure class="docs-figure">           │  ← Captura (si aplica)
│      <img src="img/NNNN.png" ...>       │
│      <figcaption>...</figcaption>       │
│  </figure>                               │
│                                          │
│  <section id="id-subseccion">           │
│      <h3>N.M Subsección</h3>            │  ← Detalle específico
│      <h4>Campo o concepto</h4>           │
│      <p>Explicación...</p>               │
│      <ul>                                │
│          <li>Punto 1</li>                │
│          <li>Punto 2</li>                │
│      </ul>                               │
│  </section>                              │
└─────────────────────────────────────────┘
```

### 4.2 Reglas de escritura para la narrativa

1. **Cada `h2` es una sección principal** → entrada en sidebar nivel 1
2. **Cada `h3` es una subsección** → entrada en sidebar nivel 2 (`.sub`)
3. **Cada `h4` es un detalle** → entrada en sidebar nivel 3 (`.subsub`)
4. **Los `h3` y `h4` deben estar dentro de un `section`** con su propio `id`
5. **Primero el contexto, luego los detalles, luego la captura**
6. **Las capturas van ENTRE secciones**, no dentro (para que `IntersectionObserver` funcione correctamente)

### 4.3 Tipos de párrafos

| Tipo | HTML | Uso |
|------|------|-----|
| Normal | `<p>texto</p>` | Explicación general |
| Lista | `<ul><li>item</li></ul>` | Enumerar opciones, pasos, características |
| Código inline | `<code>variable</code>` | Referencias a elementos de UI o código |
| Bloque código | `<pre><code>bloque</code></pre>` | Ejemplos, comandos, configuraciones |
| Callout warning | `<div class="callout warning">` | Advertencias importantes |
| Callout info | `<div class="callout info">` | Notas informativas |
| Tabla | `<table>` | Datos estructurados, parámetros |
| Figura | `<figure class="docs-figure">` | Capturas de pantalla |

---

## 5. Sistema de Capturas de Pantalla (Espacios Preconfigurados)

### 5.1 Convención de nombres

```
img/0001.png   → primera captura
img/0002.png   → segunda captura
...
```

Numeración secuencial independiente del idioma. Ambos manuales (ES/EN) comparten las mismas imágenes.

### 5.2 Marcado estándar para figura

```html
<figure class="docs-figure">
    <img src="img/0001.png"
         alt="Panel de configuración completo"
         loading="lazy">
    <figcaption>Panel de configuración completo</figcaption>
</figure>
```

**Atributos:**
| Atributo | Valor | Propósito |
|----------|-------|-----------|
| `class` | `docs-figure` | Centrado, márgenes, sombra |
| `src` | `img/NNNN.png` | Ruta relativa a la imagen |
| `alt` | Texto descriptivo | Accesibilidad (lectores de pantalla) |
| `loading` | `lazy` | Carga diferida (performance) |
| `figcaption` | Texto |leyenda visible bajo la imagen |

### 5.3 Dónde colocar las figuras (regla de oro)

**Las figuras SIEMPRE van entre secciones, NUNCA dentro de un `<section>`:**

```
✅ Correcto:
</section>
<figure class="docs-figure">...</figure>
<section id="siguiente">

❌ Incorrecto:
<section id="algo">
    <figure class="docs-figure">...</figure>   ← Dentro del section
    <p>...</p>
</section>
```

**Motivo:** El `IntersectionObserver` del scroll tracking observa `section[id]`. Si una figura está dentro, la detección de sección activa falla.

### 5.4 Estrategia de colocación

```
Narrativa → Figura → Narrativa → Figura → ...
```

1. Escribe el texto explicativo
2. Coloca la figura justo DESPUÉS del `</section>` que introduce el concepto
3. La figura muestra lo que acabas de explicar
4. Continúa con la siguiente subsección

### 5.5 Estilos CSS de la figura

```css
.docs-figure {
    margin: 20px 0;
    text-align: center;
}
.docs-figure img {
    max-width: 100%;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.docs-figure figcaption {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-muted);
    font-style: italic;
}
```

---

## 6. CSS de Documentación (docs.css) — Guía de Estilos

### 6.1 Variables de layout

```css
:root {
    --docs-max-width: 1200px;       /* Ancho máximo total */
    --docs-sidebar-width: 260px;     /* Ancho del menú lateral */
    --docs-header-height: 56px;      /* Alto de la barra superior */
}
```

### 6.2 Componentes clave

| Componente | Selector | Comportamiento |
|-----------|----------|----------------|
| Top bar | `.docs-topbar` | Fixed, z-index 100, header height |
| Sidebar | `.docs-sidebar` | Fixed left, scrollable, border-right |
| Content | `.docs-content` | Margin-left = sidebar width, max-width 860px |
| Section title | `.section-title` | 11px uppercase, muted color |
| Sub link | `.sub a` | Padding-left 36px |
| Subsub link | `.subsub a` | Padding-left 52px |
| Active link | `.active` | Primary color + left border |
| Callout | `.callout` | Left border 4px + background tint |
| Figure | `.docs-figure` | Centered, border, shadow |
| Footer | `.docs-footer` | 60px margin-top, centered, muted |

### 6.3 Responsive

```css
@media (max-width: 900px) {
    .docs-sidebar { display: none; }
    .docs-content {
        margin-left: 0;
        padding: 20px 24px 60px;
    }
}
```

**Regla simple:** En pantallas < 900px, la sidebar se oculta. El contenido ocupa todo el ancho.

---

## 7. Multi-idioma (Opcional)

### 7.1 Convención

```
docs/
├── index.html      # Idioma principal (ej. español)
├── en.html         # Traducción (ej. inglés)
├── docs.css
└── img/            # Mismas imágenes para ambos
```

### 7.2 Language switcher

```html
<div class="lang-switch">
    <a href="index.html" class="active" title="Español">ES</a>
    <a href="en.html" title="English">EN</a>
</div>
```

El enlace activo tiene clase `active` para resaltarse visualmente.

---

## 8. Toggle Tema Claro/Oscuro

```html
<button id="btn-tema" class="btn-tema" title="Cambiar tema" aria-label="Cambiar tema claro/oscuro">
    <span id="icono-tema" role="img" aria-label="luna creciente">🌙</span>
</button>
```

```javascript
document.getElementById('btn-tema')?.addEventListener('click', function() {
    const html = document.documentElement;
    const theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', theme);
    document.getElementById('icono-tema').textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', theme);
});

// Restaurar preferencia al cargar
const saved = localStorage.getItem('theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);
```

Las variables CSS en `:root` y `[data-theme="dark"]` se encargan del cambio de colores.

---

## 9. Flujo de Trabajo para una IA Agentica

### Paso 1: Analizar el proyecto

Identificar:
- Nombre y propósito
- Secciones principales de la UI
- Parámetros configurables
- Funcionalidades clave
- Comportamientos importantes

### Paso 2: Estructurar secciones

```
1. Introducción (qué es, propósito, requisitos)
2. Configuración (panel de control, parámetros)
3. Dashboard / Interfaz principal
4. Funcionalidades específicas
5. Exportación / Importación
6. Accesibilidad
7. Solución de problemas
8. Referencia / Apéndice
```

### Paso 3: Escribir narrativa punto por punto

Para cada sección:
1. `h2` → descripción general de la sección
2. `h3` → cada subfuncionalidad o grupo
3. `h4` → cada campo, botón o concepto individual
4. Texto: qué hace, cómo se usa, para qué sirve

### Paso 4: Insertar espacios para figuras

Entre `</section>` y la siguiente sección, insertar:

```html
<figure class="docs-figure">
    <img src="img/NNNN.png" alt="DESCRIPCIÓN" loading="lazy">
    <figcaption>DESCRIPCIÓN</figcaption>
</figure>
```

Donde `DESCRIPCIÓN` es lo que mostrará la captura (el usuario reemplazará con la imagen real).

### Paso 5: Construir sidebar

Por cada `h2` → `li` normal.  
Por cada `h3` → `li.sub`.  
Por cada `h4` → `li.subsub`.

### Paso 6: Verificar

- Todos los `href` del sidebar apuntan a `id`s existentes
- Las figuras están fuera de los `section`
- El HTML se ve bien incluso sin imágenes (alt text visible)
- El theme toggle funciona
- Los callouts resaltan información crítica

---

## 10. Ejemplo de Sección Completa

```html
<!-- ═══════════════════════════════════════════════════ -->
<!-- 2. PANEL DE CONFIGURACIÓN -->
<!-- ═══════════════════════════════════════════════════ -->
<section id="config">
<h2>2. Panel de Configuración</h2>
<p>El panel de configuración se encuentra en la columna izquierda de la aplicación. Desde aquí se controlan todos los parámetros del experimento antes de iniciar la simulación.</p>
</section>

<figure class="docs-figure">
    <img src="img/0002.png" alt="Panel de configuración sección Mesas y Crédito" loading="lazy">
    <figcaption>Panel de configuración — sección Mesas y Crédito</figcaption>
</figure>

<section id="config-mesas">
<h3>2.1 Mesas y Crédito</h3>

<h4>Número de Mesas</h4>
<p>Selecciona entre 1 y 100 mesas. Cada mesa opera de forma independiente con su propio estado, crédito e historial de apuestas.</p>

<h4>Crédito Inicial</h4>
<p>Define el crédito con el que parte cada mesa. El valor por defecto es <strong>1000 créditos</strong>. Puedes usar decimales (step 0.10).</p>

<div class="callout info">
    <div class="callout-title">💡 Nota</div>
    <p>Si usas crédito global, todas las mesas comparten el mismo pool.</p>
</div>
</section>
```

**Renderizado esperado:**
1. Título h2 "2. Panel de Configuración" con borde inferior
2. Párrafo introductorio explicando el panel
3. Figura con captura de pantalla del panel completo
4. Título h3 "2.1 Mesas y Crédito"
5. h4 "Número de Mesas" con explicación
6. h4 "Crédito Inicial" con explicación
7. Callout info con nota importante

---

## 11. Checklist de Verificación para la IA

- [ ] ¿El HTML tiene `<!DOCTYPE html>` y `lang` correcto?
- [ ] ¿Los `id` de los `section` coinciden con los `href` del sidebar?
- [ ] ¿Cada `h2` tiene su sección con `id`?
- [ ] ¿Cada `h3`/`h4` está dentro de un `section`?
- [ ] ¿Las figuras están FUERA de los `section`?
- [ ] ¿Los `alt` text son descriptivos?
- [ ] ¿Las imágenes tienen `loading="lazy"`?
- [ ] ¿Hay callouts para información crítica?
- [ ] ¿El theme toggle persiste preferencia?
- [ ] ¿El switcher de idioma funciona (si aplica)?
- [ ] ¿Responsive: sidebar se oculta en < 900px?
- [ ] ¿Footer con versión y fecha?

---

## 12. Referencias

- ReadTheDocs estilo sidebar: https://sphinx-rtd-theme.readthedocs.io/
- CSS custom properties (theming): https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- IntersectionObserver API: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- `loading="lazy"` para imágenes: https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading
- HTML `<figure>` y `<figcaption>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure

---

> **Nota:** Este documento describe exactamente cómo están construidas las páginas de ayuda de R-EXAM-V1 (`docs/index.html` y `docs/en.html`). Cualquier IA agentica puede usar este patrón para generar documentación equivalente en cualquier otro proyecto, manteniendo la misma calidad, navegabilidad y preparación para capturas de pantalla.
