# Product

## Register

product

## Users
Persian-speaking football/soccer fans predicting World Cup 2026 matches. They use the PWA on both mobile and desktop to enter scores, view their rank on leaderboards, check badges, and participate in private prediction groups.

## Product Purpose
A fully RTL, installable Persian PWA where users predict World Cup 2026 matches, earn points, climb daily/weekly/stage-based leaderboards, fill a knockout bracket, and compete in private groups.

## Prize Tournament
An opt-in, entry-fee prize league layered on top of the regular game. Players join via a first-visit gate on the `/tournament` page; the entry fee is 100,000 toman and the full pot (entry × members) is awarded to the winner. The tournament starts at the Belgium–Iran group match — a live countdown leads up to it, and only predictions for matches from that kickoff onward count toward a members-only standings table. Joining is opt-in only; there is no in-app payment collection yet, so the displayed pot reflects everyone who has joined.

A short **guide video** explains how to register and the rules; it surfaces both as a button on the page and as an on-open popup the player can watch or dismiss. The live top 3 of the standings earn three **named podium badges** — الماسخاله (1st), آرسنال (2nd), and الو مشکات (3rd) — shown as custom crests on the standings and on player profiles.

## Brand Personality
Sporty, modern, clean, and highly usable. Uses pitch-inspired green tones with high contrast to feel energetic yet highly functional and readable.

## Anti-references
- Heavy SaaS dashboard templates (nested cards, boring gray cards on colored backgrounds).
- Generic modern purple/blue landing page gradients that lack soccer/football flavor.
- Low-contrast light gray typography that makes RTL text hard to read.

## Design Principles
1. **RTL-First Typographic Hierarchy**: Ensure Vazirmatn font weights, sizes, and leading are tuned for perfect Persian legibility with optimal line length (65-75ch).
2. **Pitch-Green Accents for Action**: Green is reserved for interactive states, correct predictions, and highlights, grounding the app in a football stadium feel.
3. **Mobile-First Tap Targets**: Minimize input friction for predicting scores with spacious tap targets and clear numeric layout.
4. **Information Density without Noise**: Display leaderboards and fixture lists in structured, compact rows with clear contrast instead of nested cards.

## Accessibility & Inclusion
- High text-to-background contrast (minimum WCAG AA 4.5:1) for Vazirmatn body text.
- Reduced motion support for transitions.
- Large, touch-friendly tap targets on mobile (minimum 44x44px).
