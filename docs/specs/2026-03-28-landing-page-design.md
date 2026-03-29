# Mi Platicapp — Landing Page Design Spec

## Objetivo

Crear una landing page estática separada de la app que:
1. Explique qué es Mi Platicapp y por qué usarla
2. Dirija a los usuarios a conectar su cuenta de Google (→ `/app`)
3. Capture emails de interesados en una newsletter

## Audiencia

- **Personas comunes en Colombia** que ya llevan (o intentan llevar) un presupuesto mensual en Google Sheets/Excel
- **Freelancers / independientes** que necesitan controlar ingresos variables y gastos

## Tono

Combinación de tres registros:
- **Cercano:** Lenguaje coloquial colombiano, se siente como un amigo que te muestra un truco
- **Profesional:** Inspira confianza con los datos financieros del usuario
- **Tech:** Destaca la IA y la automatización sin ser intimidante

---

## Arquitectura Técnica

- **Archivo:** `public/landing.html` — HTML + CSS estático, sin React
- **Ruta:** Express sirve la landing en `/`, la app se mueve a `/app`
- **Ventajas:** Carga instantánea, mejor SEO, independiente del bundle de React
- **Estilos:** CSS vanilla embebido (no necesita Tailwind para una sola página)
- **Responsive:** Mobile-first, breakpoint principal en 768px
- **Fuente:** Inter (Google Fonts) — consistente con la app

## Cambios en server.ts

- Servir `public/landing.html` en la ruta `/`
- Servir la app React en `/app`
- Las rutas API (`/api/*`) no cambian

---

## Diseño Visual

### Paleta de colores

| Token | Valor | Uso |
|-------|-------|-----|
| `--emerald-600` | `#059669` | CTA principal, acentos, marca |
| `--emerald-900` | `#064e3b` | Sección oscura (hero, AI demo) |
| `--emerald-50` | `#ecfdf5` | Fondos suaves de sección |
| `--stone-50` | `#fafaf9` | Fondo principal |
| `--stone-900` | `#1c1917` | Texto principal |
| `--stone-500` | `#78716c` | Texto secundario |
| `--white` | `#ffffff` | Cards, surfaces |

### Estrategia de profundidad

Borders sutiles (`rgba(0,0,0,0.06)`) + shadow suave en cards. Sin gradientes dramáticos. La sección hero usa `emerald-900` como fondo oscuro para contraste.

### Tipografía

- **Display/Headlines:** Inter, 700 weight, tracking tight (-0.02em)
- **Body:** Inter, 400 weight, line-height 1.6
- **Labels/Caps:** Inter, 700 weight, 10-11px, uppercase, tracking widest (0.1em)

### Spacing

Base: 4px. Escala: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.

---

## Secciones

### 1. Navegación (sticky)

- Logo (icono Wallet + "Mi Platicapp") a la izquierda
- Links: Cómo Funciona, Características, Para Quién
- CTA: "Empezar Gratis" (botón emerald) a la derecha
- Mobile: hamburger menu

### 2. Hero

- **Fondo:** emerald-900 (oscuro, premium)
- **Headline:** "Registra tus gastos hablando, no buscando celdas"
- **Subtítulo:** "Mi Platicapp conecta con tu Google Sheets y usa IA para que registres gastos escribiendo como hablas. Sin apps nuevas, sin cambiar tu Excel."
- **CTA primario:** "Empezar Gratis — Conectar con Google" (botón blanco/emerald)
- **CTA secundario:** "Ver cómo funciona ↓" (link scroll)
- **Visual:** Mockup de la interfaz de entrada rápida IA de la app (generado como imagen)

### 3. Pain → Solution

- **Headline:** "¿Te suena familiar?"
- **3 columnas/cards** que contrastan el dolor con la solución:
  1. 😩 "Abrir el Excel, buscar la hoja, encontrar la fila..." → 😎 "Escribe '50mil almuerzo' y listo"
  2. 😩 "Se te olvida registrar y a fin de mes no cuadra" → 😎 "Registra en 5 segundos desde el celular"
  3. 😩 "Categorías confusas, fórmulas rotas" → 😎 "La IA categoriza automáticamente"

### 4. Cómo Funciona

- **Headline:** "3 pasos. 10 segundos."
- **3 pasos en línea horizontal (vertical en mobile):**
  1. **Conecta** — "Vincula tu Google Sheets existente. No cambias nada de tu Excel."
  2. **Habla** — "Escribe como hablas: 'Gasté 30mil en taxi ayer'. La IA entiende."
  3. **Listo** — "El gasto aparece en tu hoja, categorizado y con fecha."
- Cada paso con un icono y un número grande

### 5. Características (Features)

- **Headline:** "Todo lo que necesitas, nada que no"
- **Grid de 4 cards:**
  1. 🤖 **IA que entiende tu lenguaje** — "Escribe como hablas. La IA extrae monto, categoría y descripción."
  2. 📊 **Tu Excel, potenciado** — "Funciona con TU hoja de Google Sheets. No migras datos a ningún lado."
  3. 📱 **Rápido como un mensaje** — "Registra un gasto en menos de 10 segundos. Desde cualquier dispositivo."
  4. 🔒 **Tus datos son tuyos** — "Conexión directa con Google. No almacenamos tus datos financieros."

### 6. Para Quién

- **Headline:** "¿Es para ti?"
- **2 cards lado a lado:**
  1. **"Llevas tu presupuesto en Excel"** — "Ya tienes tu sistema. Solo necesitas una forma más rápida de alimentarlo. Mi Platicapp se conecta a tu hoja existente."
  2. **"Eres freelancer o independiente"** — "Ingresos variables, gastos del negocio mezclados con los personales. Categoriza todo al instante."

### 7. Newsletter (Lead Capture)

- **Fondo:** emerald-50 (suave)
- **Headline:** "Únete a los que ya manejan su platica de forma inteligente"
- **Subtítulo:** "Recibe tips de finanzas personales y novedades de Mi Platicapp."
- **Form:** Input email + botón "Suscribirme"
- **Nota:** El form enviará a un endpoint `/api/newsletter/subscribe` (implementación futura, por ahora solo UI)

### 8. Footer CTA + Footer

- **CTA final:** Fondo emerald-900, "¿Listo para dejar de sufrir con el Excel?" + botón "Empezar Gratis"
- **Footer:** Copyright, links (Privacidad, Términos), créditos

---

## Responsive

- **Desktop (≥768px):** Layout de 2-3 columnas según la sección, nav horizontal
- **Mobile (<768px):** Todo en una columna, nav con hamburger, hero más compacto, cards apiladas

## Animaciones

- Scroll-triggered fade-in suave en cada sección (CSS `@keyframes` + `IntersectionObserver`)
- Hover en botones y cards (scale sutil + shadow)
- Sin dependencias de animación externas

## SEO

- `<title>`: "Mi Platicapp — Registra gastos con IA en tu Google Sheets"
- `<meta description>`: "Deja de buscar celdas. Escribe como hablas y Mi Platicapp registra tus gastos automáticamente en tu hoja de Google Sheets."
- Heading hierarchy: H1 en hero, H2 en cada sección
- Semantic HTML: `<header>`, `<main>`, `<section>`, `<footer>`
- Open Graph tags para compartir en redes
