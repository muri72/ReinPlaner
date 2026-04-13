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
- Subline: Lead paragraph, muted color
- CTAs: Primary (blue gradient) + Secondary (outline glass)
- Social proof micro-line: "150+ Unternehmen · 4.9★ Bewertung"

**Right:**
- Glass dashboard preview card floating in space
- Browser chrome (minimal dots)
- Inside: animated KPI grid + mini calendar + mini schedule
- Glow orbs behind it (blue + cyan)

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

## 12. COMPETITIVE ADVANTAGE MATRIX

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
