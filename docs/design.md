# Gachi — Design Reference

## Visual Direction
Glassmorphism. Frosted glass cards floating over deep navy-to-purple gradient. Every surface is translucent — you feel the depth beneath. Electric lime as the single accent color against dark glass. Warm, trustworthy, modern.

## Core Principle
```
Deep gradient background
    + floating blobs (indigo/violet radial gradients, blurred)
    + frosted glass cards (rgba white 8-14%, blur 20-30px)
    + white text hierarchy
    + lime accent (#C8F135) for one thing only: action
```

## Background
```css
background: linear-gradient(135deg,
  #0a0a1a 0%,
  #0d1033 30%,
  #1a0a2e 60%,
  #0d0820 100%
);
```
Fixed, full viewport, never scrolls with content.

Decorative blobs layered on top:
- Indigo blob: top-right corner, 400px, blur 60px, opacity 30%
- Violet blob: bottom-left, 300px, blur 50px, opacity 20%
- Lime blob: center-right, 200px, blur 80px, opacity 5% (very subtle)

## Glass Card Variants

### Strong (main content cards)
```css
background: rgba(255, 255, 255, 0.12);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.18);
border-radius: 24px;
box-shadow: 0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.12);
```

### Regular (secondary cards, list items)
```css
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.10);
border-radius: 20px;
```

### Subtle (chips, tags, badges)
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(8px);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 12px;
```

### Active / Highlighted (match found)
```css
background: rgba(200, 241, 53, 0.08);
border: 1px solid rgba(200, 241, 53, 0.25);
box-shadow: 0 0 24px rgba(200,241,53,0.12),
            0 8px 32px rgba(0,0,0,0.3);
```

## Typography
- **Clash Display** — all headings (bold, display weight)
- **DM Sans** — body, labels, UI text
- All text: white spectrum only
  - Primary: rgba(255,255,255,1.0)
  - Secondary: rgba(255,255,255,0.6)
  - Tertiary: rgba(255,255,255,0.35)

## Accent Color Usage
Electric lime `#C8F135` used ONLY for:
- Primary CTA buttons
- Active GPS indicator dot
- Active state on tabs/toggles
- Trust Score ring fill (high score)
- Match notification glow

Everything else: white variants or semantic colors (red for danger, yellow for warning, green for success).

## Reference UI Adaptation
Dribbble reference (Agentic Calendar AI) uses:
- Light cards on dark bg → we use glass cards on gradient
- Single red accent → we use single lime accent
- Clean sans typography → we use Clash Display + DM Sans
- Circular progress ring → we keep this for Trust Score
- Date strip at bottom → we use glass bottom tab bar
- "Start task" pill button → we use lime pill buttons

Same skeleton, glassmorphism soul.

## Do / Don't

### Do
- Layer multiple glass surfaces (card inside card feels luxurious)
- Let gradient show through all surfaces
- Use blur generously — 16-30px is the sweet spot
- Keep borders subtle: rgba white 10-18% only
- One lime element per screen maximum

### Don't
- Don't use solid backgrounds inside glass cards
- Don't use colored glass (only white/neutral transparency)
- Don't add drop shadows without blur behind them
- Don't use lime for more than one element per screen
- Don't make glass too opaque (>25% loses the effect)
