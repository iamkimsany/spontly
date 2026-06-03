# Spontly — UX/UI Specification

## Design Philosophy
Glassmorphism-first. Frosted glass cards floating over deep gradient backgrounds. Every surface feels like frosted glass — light passes through, depth is visible beneath. Safety-forward, activity-first, friction-minimal.

---

## Design System

### Background Gradient
```css
background: linear-gradient(135deg, #0a0a1a 0%, #0d1033 30%, #1a0a2e 60%, #0d0820 100%);
```
Deep navy → indigo → purple — always full-screen, never tiled.

### Glassmorphism Card Style
```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.glass-card-strong {
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.glass-card-subtle {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
```

### Color Palette
```
--- Backgrounds ---
Gradient Start:   #0a0a1a   (deep navy)
Gradient Mid:     #1a0a2e   (deep purple)
Gradient End:     #0d0820   (near black)

--- Glass Surfaces ---
Card bg:          rgba(255,255,255, 0.08)
Card bg strong:   rgba(255,255,255, 0.14)
Card bg subtle:   rgba(255,255,255, 0.05)
Border:           rgba(255,255,255, 0.12)
Border strong:    rgba(255,255,255, 0.20)

--- Accent ---
Primary:          #C8F135   (electric lime)
Primary glow:     rgba(200,241,53, 0.25)
Primary soft:     rgba(200,241,53, 0.12)

--- Accent decorative blobs ---
Blob 1:           rgba(99, 102, 241, 0.3)   (indigo)
Blob 2:           rgba(139, 92, 246, 0.2)   (violet)
Blob 3:           rgba(200, 241, 53, 0.08)  (lime, subtle)

--- Text ---
Primary:          rgba(255,255,255, 1.0)
Secondary:        rgba(255,255,255, 0.6)
Tertiary:         rgba(255,255,255, 0.35)

--- Semantic ---
Success:          #4ADE80
Warning:          #FACC15
Danger:           #F87171
SOS:              #EF4444
```

### Background Decorative Blobs
```css
.blob-1 {
  position: absolute;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%);
  border-radius: 50%;
  top: -100px; right: -100px;
  filter: blur(60px);
  pointer-events: none;
}
.blob-2 {
  position: absolute;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%);
  border-radius: 50%;
  bottom: 100px; left: -80px;
  filter: blur(50px);
  pointer-events: none;
}
```

### Typography
```
Display:   Clash Display — headings, hero text
Body:      DM Sans — paragraphs, labels
Mono:      JetBrains Mono — codes, timestamps

Scale:
  xs:   11px / 16px
  sm:   13px / 18px
  base: 15px / 22px
  md:   17px / 24px
  lg:   22px / 28px
  xl:   28px / 34px
  2xl:  36px / 42px

All text on glass: white variants (see Color Palette above)
```

### Spacing
```
Base unit: 4px
Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
Internal card padding: 20px 24px
```

### Border Radius
```
sm:   10px  (chips, tags, badges)
md:   16px  (inputs, small cards)
lg:   24px  (main cards)
xl:   32px  (bottom sheets, modals)
full: 9999px (pills, avatars, buttons)
```

---

## Component Styles

### Primary Button
```css
.btn-primary {
  background: #C8F135;
  color: #0a0a1a;
  border: none;
  border-radius: 9999px;
  padding: 14px 28px;
  font-weight: 600;
  font-size: 15px;
  box-shadow: 0 0 24px rgba(200,241,53,0.35);
}
.btn-primary:hover {
  box-shadow: 0 0 36px rgba(200,241,53,0.5);
  transform: translateY(-1px);
}
```

### Glass Button (secondary)
```css
.btn-glass {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 9999px;
  padding: 14px 28px;
  backdrop-filter: blur(10px);
}
```

### GPS Status Indicator
```css
.gps-active {
  display: flex; align-items: center; gap: 8px;
  background: rgba(200,241,53,0.12);
  border: 1px solid rgba(200,241,53,0.3);
  border-radius: 9999px;
  padding: 6px 14px;
  color: #C8F135;
  font-size: 13px;
}
.gps-dot {
  width: 8px; height: 8px;
  background: #C8F135;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.gps-off {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4);
}
```

### Trust Score Ring
```css
/* SVG circle ring, lime fill on semi-transparent track */
.trust-ring-track  { stroke: rgba(255,255,255,0.1); }
.trust-ring-fill   { stroke: #C8F135; stroke-linecap: round; }
/* 0-30: grey fill, 31-60: lime, 61-100: gold #FFD700 */
```

### SOS Button
```css
.btn-sos {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(239,68,68,0.2);
  border: 1.5px solid rgba(239,68,68,0.5);
  color: #F87171;
  backdrop-filter: blur(10px);
  font-size: 20px;
}
/* Press + hold 2s: circular red border fills clockwise */
```

### Safety Zone Badges
```css
.zone-green  { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.4); color: #4ADE80; }
.zone-yellow { background: rgba(250,204,21,0.15); border-color: rgba(250,204,21,0.4); color: #FACC15; }
.zone-red    { background: rgba(248,113,113,0.15); border-color: rgba(248,113,113,0.4); color: #F87171; }
.zone-black  { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); color: #fff; }
.zone-sos    { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.6); color: #EF4444; }
```

---

## Screen Specifications

### 01. Onboarding (3 slides)

**All slides**: full gradient background + blobs

**Slide 1 — The Problem**
- Large frosted glass card center-screen
- Headline: "Want to do something. No one to do it with."
- Subtext muted white
- CTA: lime pill button "See how it works →"

**Slide 2 — The Solution**
- Glass card with app UI preview inside (nested glass)
- Headline: "Add what you want to do"
- Subtext: "AI finds people nearby who want the same thing right now"

**Slide 3 — Safety**
- Shield icon with lime glow
- Headline: "Built safe from day one"
- 3 glass chips: GPS protection · Trusted contact · AI detector
- CTA: "Get started"

---

### 02. Registration
5 steps, each full-screen with gradient bg + single glass card:
- Phone → SMS OTP → Profile (photo + selfie) → Trusted contact → GPS consent

---

### 03. Home Screen

```
[Gradient bg + blobs behind everything]

┌─────────────────────────────┐   ← glass header, blur
│  Good evening, Aliya  ⚙️    │
│  Wed, Jun 6                 │
└─────────────────────────────┘

┌─────────────────────────────┐   ← glass-card-strong, lime left glow
│ 🔥 Active Match        NOW  │
│ Hiking at Bukhansan         │
│ ○ ○ +1   [View Match →]    │
└─────────────────────────────┘

My Activities
┌────────┐ ┌────────┐  [+]    ← glass-card-subtle chips
│ Hiking │ │ Salsa  │
│ Today  │ │Someday │
└────────┘ └────────┘

Nearby Right Now             ← glass list rows
─ Jung wants to hike  →
─ Sara wants to sketch →
```

---

### 04–10. Other Screens
All screens follow same pattern:
- Gradient + blobs as base layer
- Glass cards for content containers
- Glass inputs (rgba white 8%, blur 10px, white border 12%)
- All text in white variants
- Lime for active/primary actions only
- Bottom tab bar: glass with stronger blur (blur 40px)

---

## Micro-interactions
- Card appear: fade-in + translateY(20px→0) + blur(10px→0), 350ms
- Match found: card slides up + lime glow pulse (0→1→0.3 opacity, 2 cycles)
- GPS dot: scale pulse 1→1.3→1, 1.5s infinite
- SOS hold: red circular border fills clockwise, 2s
- Trust ring: animated stroke-dashoffset on mount
- Button hover: translateY(-1px) + box-shadow glow intensifies
- Bottom sheet open: slide up + blur background deepens

---

## Navigation
```
Bottom Tab Bar (glass, blur 40px):
  🏠 Home  |  📋 My List  |  🔔 Alerts  |  👤 Profile
```
