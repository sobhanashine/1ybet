---
name: 1ybet
description: A fully Persian (RTL) World Cup 2026 prediction PWA.
colors:
  primary: "#0f7b5a"
  primary-hover: "#0c6249"
  primary-active: "#0a4f3b"
  neutral-bg: "#f2faf6"
  neutral-surface: "#ffffff"
  ink: "#14201b"
  muted: "#6b7c74"
  gold: "#e6b400"
  border: "#d8f0e4"
typography:
  display:
    fontFamily: "var(--font-vazir), system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.15
  body:
    fontFamily: "var(--font-vazir), system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "6px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input-score:
    backgroundColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "8px"
---

# Design System: 1ybet

## 1. Overview

**Creative North Star: "The Tactical Turf"**

The Tactical Turf design system is structured like a crisp football playbook. It values absolute clarity, functional space, and sharp UI precision. Every fixture list, leaderboard, and badge collection is laid out with deliberate statistical alignment. The design uses a sporty, pitch-inspired theme that balances warm, off-white pitch greens with bold, high-contrast typography, evoking the spirit of the stadium while maintaining the highest standard of daily usability.

This design system rejects generic SaaS landing page tropes (such as neon/purple gradients, decorative dark glows, and nested card components). Instead, it focuses on high-contrast, readable typography, flat-at-rest components, and purposeful highlight colors.

**Key Characteristics:**
- **RTL-First Layouts**: Seamlessly aligned for Persian script, ensuring text flows naturally and number inputs don't flip awkwardly.
- **Pitch-Green Accents**: Deep green is used functionally to signify actions, correct predictions, and status.
- **Sporty Precision**: Grid layouts and tabular numerals align match data and scores cleanly.

## 2. Colors

A stadium-inspired color palette that relies on deep greens, crisp off-white turf tones, and clean neutral ink for maximum readability.

### Primary
- **Pitch Green** (#0f7b5a): Used for interactive primary buttons, links, and success states (e.g. points earned).
- **Deep Pitch** (#0c6249): Used for primary hover states.

### Neutral
- **Off-white Turf** (#f2faf6): The background color of the body. Clean, slightly warm, and easy on the eyes.
- **Stadium White** (#ffffff): Used for card and modal backgrounds.
- **Dark Ink** (#14201b): Primary text color, ensuring a sharp contrast ratio against both off-white and pure white surfaces.
- **Muted Slate** (#6b7c74): Used for labels, subheadings, and secondary lock/time indicators.
- **Chalk Border** (#d8f0e4): Light border color to delineate fixtures and profile sections.

### Named Rules
**The Pitch Presence Rule.** Green is reserved for primary actions, success/correct predictions, and active navigation indicators. It must never be used for passive backgrounds or secondary styling.

## 3. Typography

**Display Font:** Vazirmatn (via `--font-vazir`)
**Body Font:** Vazirmatn (via `--font-vazir`)

**Character:** Bold, modern Persian typography that prioritizes readability in high-density data tables and match sheets.

### Hierarchy
- **Display** (800, clamp(2rem, 5vw, 3.5rem), 1.15): Used for main page headers and scoreboard scores.
- **Headline** (700, 1.5rem, 1.2): Used for card titles and section titles.
- **Title** (600, 1.125rem, 1.25): Used for team names and secondary headers.
- **Body** (400, 1rem, 1.5): Used for descriptions, leaderboard names, and rules. Line length is capped at (65ch).
- **Label** (500, 0.75rem, 1.2): Used for helper text, group labels, and timestamps.

### Named Rules
**The Tabular Alignment Rule.** All numeric values, scores, and fixture rankings must utilize tabular numbers (`font-feature-settings: "ss01"`) and remain center-aligned or LTR to avoid orientation flipping in Persian RTL context.

## 4. Elevation

The system is flat-by-default, emphasizing structured grid boundaries and borders over artificial drop shadows.

### Named Rules
**The Flat-At-Rest Rule.** Card components and input containers must remain flat at rest with a simple border or thin ring, only lifting via elevation/shadow on hover or active interaction to prevent visual clutter.

## 5. Components

### Buttons
- **Shape:** Rounded corners (8px radius)
- **Primary:** Pitch Green background with bold White text.
- **Hover / Focus:** Transitions to Deep Pitch on hover.

### Cards / Containers
- **Corner Style:** Rounded corners (16px radius)
- **Background:** Stadium White background with a 1px ring (`ring-1 ring-black/5`) at rest.
- **Shadow Strategy:** Flat at rest, no deep shadow.

### Inputs / Fields
- **Style:** Flat, Off-white Turf background with a light border (8px radius).
- **Focus:** Sharp transition to Pitch Green border.

### Navigation
- **Style:** Bottom navigation bar on mobile, utilizing semi-transparent Stadium White with backdrop blur (`backdrop-blur`).
- **States:** Active links use Pitch Green; inactive links use Muted Slate.

## 6. Do's and Don'ts

### Do:
- **Do** use `font-feature-settings: "ss01"` on numeric score listings to keep digits aligned in tabular columns.
- **Do** ensure all main Persian body text has at least a 4.5:1 contrast ratio against the background.
- **Do** use input type `number` with text alignment centered and direction forced to `ltr` for score inputs.

### Don't:
- **Don't** use neon/purple gradients or generic SaaS card shapes.
- **Don't** use side-stripe borders or left/right accent stripes on fixture lists or leaderboard cards.
- **Don't** animate image overlays or card pictures on hover.
