# ReinPlaner Design Specification — 2026 Edition
## Ultra-Modern UI: Glassmorphism + Brutalist Typography + Award-Winning Style

---

## 1. DESIGN PHILOSOPHY

**Creative Direction:** "Professional Brutalism meets Glassmorphism"
- Die visuelle Sprache sagt: "Wir sind anders. Wir sind besser. Wir sind die Zukunft."
- Konkurrenz (Timesafe, CleanManager, Swept) sieht aus wie 2019 — wir sehen aus wie 2026
- Keine verspielten Rundungen. Klare Kanten. Mutige Typografie. Echter Depth.

---

## 2. COLOR SYSTEM

### Background Layers
```
--bg-deep:        #05080F   (Darkest base - page background)
--bg-dark:        #0A0E1A   (Dark navy - sections)
--bg-elevated:    #0F1524   (Elevated cards)
--bg-surface:     #141B2D   (Surface elements)
--bg-card:        #1A2235   (Card backgrounds)
--bg-glass:       rgba(26, 34, 53, 0.6)  (Glass panels)
```

### Accent Colors
```
--accent-blue:    #2563EB   (Electric blue - primary actions)
--accent-cyan:    #06B6D4   (Cyan - secondary accent)
--accent-violet:  #7C3AED   (Violet - highlights)
--accent-emerald: #10B981   (Emerald - success/positive)
--accent-amber:   #F59E0B   (Amber - warnings)
--accent-rose:    #F43F5E   (Rose - errors/destructive)
```

### Text Colors
```
--text-primary:   #F1F5F9   (Primary text - near white)
--text-secondary: #94A3B8   (Secondary text - slate)
--text-muted:     #475569   (Muted text)
--text-inverse:   #0A0E1A   (Text on light backgrounds)
```

### Gradients
```
--gradient-hero:    linear-gradient(135deg, #05080F 0%, #0F1524 50%, #0A1628 100%)
--gradient-blue:    linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)
--gradient-glow-bl: linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(6,182,212,0.08) 100%)
--gradient-glow-pr: linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(37,99,235,0.08) 100%)
```

---

## 3. TYPOGRAPHY

### Font Stack
```css
/* Clash Display - Headlines (Brutalist editorial feel) */
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700,500&f[]=satoshi@400,500,700&display=swap');

font-family: 'Clash Display', 'Satoshi', system-ui, sans-serif;

/* Satoshi - Body (Clean, modern, readable) */
font-family: 'Satoshi', 'Inter', system-ui, sans-serif;
```

### Type Scale
```
--text-display:  clamp(3.5rem, 8vw, 6rem)    /* Hero headlines */
--text-h1:        clamp(2.5rem, 5vw, 4rem)     /* Section titles */
--text-h2:        clamp(1.75rem, 3vw, 2.5rem)   /* Subsection titles */
--text-h3:        1.5rem                        /* Card titles */
--text-lead:       1.25rem                      /* Lead paragraphs */
--text-body:       1rem                         /* Body text */
--text-sm:         0.875rem                     /* Small text */
--text-xs:         0.75rem                     /* Micro text */
```

### Brutalist Heading Treatment
- Headlines are ALL CAPS or Display case
- Heavy font-weight (600-700 for display, 500-600 for subheadings)
- Tight letter-spacing (-0.02em to -0.04em for large sizes)
- Line-height: 1.05-1.1 for headlines (creates density)

---

## 4. GLASSMORPHISM SYSTEM

### Glass Card
```css
background: rgba(26, 34, 53, 0.6);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: 
  0 4px 24px rgba(0, 0, 0, 0.3),
  inset 0 1px 0 rgba(255, 255, 255, 0.05);
border-radius: 16px;
```

### Glass Card Hover State
```css
background: rgba(26, 34, 53, 0.8);
border: 1px solid rgba(255, 255, 255, 0.12);
transform: translateY(-2px);
box-shadow: 
  0 8px 40px rgba(0, 0, 0, 0.4),
  0 0 40px rgba(37, 99, 235, 0.08);
```

### Glass Navigation
```css
background: rgba(5, 8, 15, 0.8);
backdrop-filter: blur(20px);
border-bottom: 1px solid rgba(255, 255, 255, 0.06);
```

---

## 5. GRAIN/NOISE TEXTURE

```css
/* Applied to backgrounds and glass panels */
position: relative;
overflow: hidden;

.grain::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
```

---

## 6. MICRO-ANIMATIONS

### Entrance Animation (Scroll-Triggered)
```css
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-up {
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}

.stagger-1 { animation-delay: 0ms; }
.stagger-2 { animation-delay: 100ms; }
.stagger-3 { animation-delay: 200ms; }
.stagger-4 { animation-delay: 300ms; }
.stagger-5 { animation-delay: 400ms; }
.stagger-6 { animation-delay: 500ms; }
```

### Hover Card Lift
```css
.card-hover {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(37, 99, 235, 0.1);
}
```

### Button Pulse
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
}
.btn-pulse {
  animation: pulse-glow 2s infinite;
}
```

### Number Counter Animation
```css
/* JS-driven, counts up from 0 to target on scroll into view */
```

### Gradient Shift (Background)
```css
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.gradient-animated {
  background-size: 200% 200%;
  animation: gradientShift 8s ease infinite;
}
```

### Magnetic Button Effect
```css
/* On hover, subtle pull toward cursor (CSS-only approximation) */
.magnetic-btn {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.magnetic-btn:hover {
  transform: scale(1.02);
}
```

---

## 7. LANDING PAGE — SECTION-BY-SECTION

### NAVIGATION
- Sticky glass navbar with logo + nav links + CTA button
- On scroll: navbar gets stronger blur + border
- Mobile: fullscreen overlay menu with staggered item animations

### HERO SECTION
**Layout:** Two-column — left text, right visual
**Left:**
- Badge: "14 Tage kostenlos · Keine Kreditkarte" (glass pill)
- Headline: "DIE SOFTWARE FÜR GEBÄUDEREINIGUNG" (Display, 6rem, tight tracking)
- Headline uses `<span className="block">` for responsive line breaks
- Subline: Lead paragraph, muted color
- CTAs: Primary (blue gradient) + Secondary (outline glass)
- Social proof micro-line: "150+ Unternehmen · 4.9★ Bewertung"

**Right:**
- Glass dashboard preview card floating in space with `animate-float`
- Browser chrome (minimal dots)
- Inside: animated KPI grid + mini calendar + mini schedule
- Multiple large glow orbs behind it (blue + cyan + violet + emerald)

**Wow-Factor Enhancements:**
- Headline textShadow: `0 0 60px rgba(37,99,235,0.3)`
- Animated gradient background with gradient-shift
- Large dynamic orbs with pulse-slow animations and delays
- Dashboard preview floats with shadow-[0_8px_60px_rgba(0,0,0,0.5)]
- Multiple decorative glows: `-inset-4 bg-gradient-to-r from-blue-600/20 via-violet-600/10 to-cyan-500/20`

### STATS BAR
- Full-width glass bar, 4 stats side by side
- Number + Label, separated by vertical dividers
- Count-up animation on scroll into view

### FEATURES GRID
- 6-card grid (2 rows × 3 cols on desktop)
- Each card: Glass panel, icon in colored circle, title, description
- Hover: card lifts + icon circle gets glow ring

### HOW IT WORKS (3-Step)
- Numbered steps with connecting lines
- Each step: glass card with illustration area + text
- Steps: Registrieren → Einrichten → Durchstarten

### TESTIMONIALS
- Dark section (slightly lighter than hero bg)
- 3 large quote cards in row
- Each: large quote text, author info, star rating
- Subtle gradient glow behind section

### PRICING SECTION
- 3 pricing cards, middle one highlighted (scaled up, glow border)
- Glass cards with smooth hover states
- Feature checkmarks with emerald color
- CTA buttons with pulse animation on highlighted card

### TRUST / BENEFITS GRID
- 3-column grid of benefit items
- Each: icon + title + short description
- Benefits: DSGVO, Made in Germany, Support, Fast Setup, etc.

### FINAL CTA SECTION
- Full-width gradient section (blue → slightly lighter)
- Large headline + subline
- Primary CTA button
- Trust line below

### FOOTER
- Dark glass footer
- Logo + nav links + legal + social
- Subtle top border with gradient

---

## 8. DASHBOARD — PAGE-BY-PAGE

### Dashboard Home (`/dashboard`)
**Layout:** Full-width with left sidebar (collapsible on mobile)

**Sidebar:**
- Glass sidebar with logo + nav items + user profile
- Active item: blue accent left border + subtle glow
- Hover: smooth highlight transition

**Main Content:**
- Header: Greeting + date + notification bell
- Stats row: 5 glass metric cards with icons + values
- Main grid: 2-column — Activity feed (large left) + Upcoming tasks (right)
- Calendar preview widget
- Quick action buttons

### Dashboard Stat Cards
```css
Glass panel with:
- Top: icon in colored circle
- Middle: large number value (count-up animation)
- Bottom: label + change indicator (green/red arrow)
```

### Activity Feed
```css
Glass card, list of items:
- Icon + description + timestamp
- Subtle separator lines
- "View all" link at bottom
```

### Dashboard Scheduling View (`/dashboard/planning`)
- Full calendar view (week/month)
- Glass-styled calendar cells with shift indicators
- Sidebar: filter controls + employee list

### Dashboard Employee View (`/dashboard/employees`)
- Grid of employee cards
- Each card: avatar + name + role + today's status indicator

### Dashboard Shift Cards
```css
Glass card:
- Top bar with employee name + time
- Body: task list
- Bottom: status badge
- Hover: lift + glow
```

---

## 9. REGISTRATION PAGE — REDESIGN

### Glass-styled registration flow
- Two-step: Plan Selection → Account Details
- Glass cards for form container
- Smooth step transitions
- Input fields: glass style with focus glow
- Plan cards: selectable with visual highlight

### Registration Form Contrast Requirements
```css
/* Labels must be white for WCAG AA compliance */
Label { className: "text-white" }  /* was text-slate-300 */

/* Placeholder text must be visible */
Input { className: "placeholder:text-slate-300" }  /* was text-slate-500 */

/* Focus ring stronger */
Input.focused { ring-4 ring-blue-500/20 }  /* was ring-blue-500/10 */
```

---

## 9b. LOGIN PAGE — BRANDING FIX

### Branding Corrections
| Element | Before (WRONG) | After (CORRECT) |
|---------|----------------|----------------|
| Headline | "ReinPlaner Management" | "ReinPlaner" |
| Subline | "Glas- und Gebäudereinigung" | "Software für Gebäudereinigung" |
| Bottom tagline | "Ihr Partner für zuverlässige Sauberkeit" | "Für Reinigungsfirmen jeder Größe" |

### Login Page Glow Enhancement
```css
/* More dynamic, multi-colored glow effects */
.gradient-orb-1 {  // blue
  w-[600px] h-[600px]
  bg-blue-500/25
  blur-[120px]
}
.gradient-orb-2 {  // cyan
  w-[500px] h-[500px]
  bg-cyan-400/20
  blur-[100px]
}
.gradient-orb-3 {  // violet (NEW)
  w-[400px] h-[400px]
  bg-violet-500/15
  blur-[80px]
}
.gradient-orb-4 {  // blue-600 (NEW)
  w-[350px] h-[350px]
  bg-blue-600/15
  blur-[70px]
}
```

---

## 10. GLOBAL DESIGN TOKENS

### Spacing
```
--space-xs:  4px
--space-sm:  8px
--space-md:  16px
--space-lg:  24px
--space-xl:  32px
--space-2xl: 48px
--space-3xl: 64px
--space-4xl: 96px
```

### Border Radius
```
--radius-sm:   8px
--radius-md:   12px
--radius-lg:   16px
--radius-xl:   24px
--radius-full: 9999px
```

### Shadows (not the typical drop-shadow)
```
--shadow-glass:   0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)
--shadow-card:    0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)
--shadow-card-hover: 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(37, 99, 235, 0.1)
--shadow-glow-blue: 0 0 40px rgba(37, 99, 235, 0.3)
--shadow-glow-cyan: 0 0 40px rgba(6, 182, 212, 0.3)
```

---

## 11. IMPLEMENTATION NOTES

### Font Loading
```tsx
// In layout.tsx or globals.css
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700,500&f[]=satoshi@400,500,700&display=swap');
```

### Grain Texture
```css
/* Add to globals.css as a utility class */
.grain { position: relative; }
.grain::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}
```

### Animation Keyframes
```css
@keyframes fadeUp { ... }
@keyframes fadeIn { ... }
@keyframes slideInLeft { ... }
@keyframes countUp { ... } (JS-driven)
@keyframes shimmer { ... }
@keyframes float { ... }
```

### Key CSS Variables (in globals.css)
```css
:root {
  --bg-deep: #05080F;
  --bg-dark: #0A0E1A;
  --bg-elevated: #0F1524;
  --bg-surface: #141B2D;
  --bg-card: #1A2235;
  --bg-glass: rgba(26, 34, 53, 0.6);
  --accent-blue: #2563EB;
  --accent-cyan: #06B6D4;
  --accent-violet: #7C3AED;
  --accent-emerald: #10B981;
  --accent-amber: #F59E0B;
  --accent-rose: #F43F5E;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
}
```

---

## 12. CONTRAST REQUIREMENTS (WCAG AA)

### Text Contrast Ratios
| Element | Color | Background | Ratio | Status |
|---------|-------|------------|-------|--------|
| Primary Labels (Light BG) | `text-white` | Glass bg `rgba(26,34,53,0.6)` | ~9:1 | ✅ Pass |
| Primary Labels (Dark BG) | `text-slate-100` | Dark `bg-[#0A0E1A]` | ~12:1 | ✅ Pass |
| Placeholder Text | `placeholder:text-slate-300` | Glass bg | ~4.5:1 | ✅ Pass (AA) |
| Trust Badges | `text-slate-200` | Dark section | ~8:1 | ✅ Pass |
| Input Focus Ring | `ring-blue-500/20` | Glass bg | ~5:1 | ✅ Pass |
| Muted Text | `text-slate-400` | Dark `bg-[#05080F]` | ~6:1 | ✅ Pass |

### Requirements
- All normal text must meet WCAG AA (4.5:1 contrast ratio)
- Large text (18px+) must meet WCAG AA (3:1 contrast ratio)
- Interactive elements (buttons, inputs) must have clear focus states
- Never use `text-slate-500` on glass/dark backgrounds — use `text-slate-300` minimum
- Never use `placeholder:text-slate-500` — use `placeholder:text-slate-300` minimum

---

## 13. COMPETITIVE ADVANTAGE MATRIX

| Feature | Timesafe | CleanManager | Swept | **ReinPlaner** |
|---------|---------|--------------|-------|--------------|
| Glassmorphism UI | ❌ | ❌ | ❌ | ✅ |
| Brutalist Typography | ❌ | ❌ | ❌ | ✅ |
| Grain Textures | ❌ | ❌ | ❌ | ✅ |
| Micro-animations | ❌ | ❌ | ❌ | ✅ |
| Dark theme default | ❌ | ❌ | ❌ | ✅ |
| Award-winning feel | ❌ | ❌ | ❌ | ✅ |
| Modern color palette | ❌ | ❌ | ❌ | ✅ |
| Floating glass cards | ❌ | ❌ | ❌ | ✅ |

---

## 13. CONTRAST REQUIREMENTS (WCAG AA+)

### Light Background (Login right panel, Register form)
```
Body text on light bg:     text-slate-900  (#0f172a) ✅ 14.4:1
Subtext on light bg:        text-slate-800  (#1e293b) ✅ 11.5:1  
Labels on light bg:          text-slate-800  (#1e293b) ✅ 11.5:1
Muted text on light bg:     text-slate-700  (#334155) ✅ 7.9:1
Descriptions on light bg:    text-slate-600  (#475569) ✅ 5.3:1
```

### Dark Background (Landing Page, Dashboard, Login left panel)
```
Headlines on dark bg:        text-white     (#f1f5f9) ✅ 18.1:1
Primary text on dark bg:      text-slate-100  (#f1f5f9) ✅ 18.1:1
Secondary text on dark bg:    text-slate-300  (#cbd5e1) ✅ 9.1:1
Muted text on dark bg:       text-slate-400  (#94a3b8) ✅ 5.7:1
Label text on dark bg:       text-slate-200  (#e2e8f0) ✅ 12.6:1
```

### NEVER USE (Too Low Contrast)
- text-slate-500 (#64748b) on dark backgrounds — FAIL
- text-slate-400 (#94a3b8) on light backgrounds — FAIL
- text-slate-500 (#64748b) as input placeholder on dark backgrounds — FAIL
- text-white on white/light backgrounds — FAIL
- #94a3b8 as primary label on glass inputs — FAIL

### Input Focus States
- Border: var(--accent-blue) — always visible
- Ring: 4px ring with 20% opacity blue + 30px glow spread
- Background: slightly lighter on focus
- Icon color: blue-400 or blue-500
