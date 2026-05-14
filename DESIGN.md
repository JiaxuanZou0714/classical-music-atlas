---
name: Classical Music Timeline
description: A brand-led timeline gateway for classical music exploration.
colors:
  paper: "oklch(96.8% 0.018 84)"
  paper-deep: "oklch(93.2% 0.024 82)"
  paper-lift: "oklch(98% 0.012 84)"
  ink: "oklch(25% 0.045 238)"
  ink-soft: "oklch(44% 0.032 235)"
  rule: "oklch(76% 0.018 86)"
  rule-strong: "oklch(60% 0.025 230)"
  concert-red: "oklch(45% 0.118 24)"
  focus: "oklch(55% 0.12 24)"
  renaissance: "oklch(88% 0.032 152)"
  baroque: "oklch(88% 0.038 75)"
  classical: "oklch(88% 0.03 288)"
  romantic: "oklch(88% 0.04 29)"
  modern: "oklch(87% 0.032 210)"
typography:
  display:
    fontFamily: "\"Iowan Old Style\", \"Songti SC\", \"Noto Serif SC\", \"Source Han Serif SC\", Georgia, serif"
    fontSize: "clamp(3rem, 10vw, 7rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "0"
  headline:
    fontFamily: "\"Iowan Old Style\", \"Songti SC\", \"Noto Serif SC\", \"Source Han Serif SC\", Georgia, serif"
    fontSize: "clamp(1.7rem, 4vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "0"
  body:
    fontFamily: "\"Aptos\", \"Segoe UI\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "\"Aptos\", \"Segoe UI\", \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  base: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  xxl: "3rem"
  xxxl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-lift}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1rem"
    height: "2.75rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1rem"
    height: "2.75rem"
  chip:
    backgroundColor: "{colors.paper-lift}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 0.7rem"
    height: "2.5rem"
  input-search:
    backgroundColor: "{colors.paper-lift}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 0.75rem"
    height: "2.75rem"
---

# Design System: Classical Music Timeline

## 1. Overview

**Creative North Star: "The Private Listening Atlas"**

The interface is a serious listener's annotated desk map: a warm paper surface, quiet ink lines, sparse red marks, and timeline bands that behave like information rather than decoration. It should feel collected and usable, not nostalgic theater.

The implemented system is static-first and GitHub Pages-safe. The visual complexity comes from semantic HTML, CSS tokens, SVG-like layout behavior, and client-side JSON data; no server-only rendering or runtime service is part of the core experience.

The system rejects streaming-service promotion, course-ad urgency, encyclopedia density, fake old-world ornament, and AI tool aesthetics. Historical atmosphere comes from proportion, spacing, labels, and the timeline itself.

**Key Characteristics:**
- Map-first composition with the timeline as the dominant visual object.
- Dense enough for serious listeners, edited enough for calm browsing.
- Period color used as structured information.
- Chinese and English names treated as first-class content.
- Gentle motion that supports discovery without becoming theatrical.
- Static-first execution so the full experience can ship cleanly on GitHub Pages.

## 2. Colors

The palette is a low-chroma Full palette: a warm paper base, quiet ink structure, one concert-red accent, and five muted historical period bands.

### Primary
- **Quiet Ink Blue** (`ink`): Primary text, timeline strokes, navigation, composer labels, and high-contrast buttons. It is a printed-ink color, not digital navy.
- **Soft Ink Blue** (`ink-soft`): Secondary copy, metadata, helper captions, and non-primary navigation states.

### Secondary
- **Concert Red** (`concert-red`): Brand glyph, selected chips, active text links, and the rare listening-note accent. Its rarity gives it authority.
- **Focus Red** (`focus`): Keyboard focus rings and selected timeline feedback.

### Tertiary
- **Renaissance Green** (`renaissance`): Low-chroma period band for early music.
- **Baroque Ochre** (`baroque`): Low-chroma period band for Baroque music.
- **Classical Violet** (`classical`): Low-chroma period band for Classical-era music.
- **Romantic Rose** (`romantic`): Low-chroma period band for Romantic-era music.
- **Modern Blue** (`modern`): Low-chroma period band for twentieth-century music.

### Neutral
- **Warm Paper** (`paper`): Main page surface and the emotional base of the brand.
- **Deep Paper** (`paper-deep`): Timeline field background.
- **Lifted Paper** (`paper-lift`): Panels, cards, search fields, and active surface layers.
- **Soft Rule** (`rule`): Hairlines, panel borders, inactive dividers.
- **Strong Rule** (`rule-strong`): Search borders, brand glyph border, and stronger map marks.

### Named Rules

**The Timeline Legibility Rule.** Period color never competes with composer bars, labels, or date marks. If the timeline needs effort to read, the palette is wrong.

**The Red Rarity Rule.** Concert red is for selection, navigation emphasis, and annotation. Do not spread it across decorative elements.

**The No Faux-Antique Rule.** Historical does not mean sepia, gold trim, distressed textures, or decorative frames.

## 3. Typography

**Display Font:** `"Iowan Old Style", "Songti SC", "Noto Serif SC", "Source Han Serif SC", Georgia, serif`
**Body Font:** `"Aptos", "Segoe UI", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif`
**Label/Mono Font:** No separate mono face. Labels use the body stack with spacing and size changes.

**Character:** The pairing reads like program notes and map labels. The display stack gives Chinese headlines a printed, literary weight; the body stack stays clean and static-site friendly.

### Hierarchy
- **Display** (500, `clamp(3rem, 10vw, 7rem)`, 1.05): Homepage title only. It should dominate without becoming a generic hero headline.
- **Headline** (500, `clamp(1.7rem, 4vw, 3rem)`, 1.05): Timeline panel titles, section headings, and route openings.
- **Title** (500, 1.6rem to 2rem, tight line-height): Composer names, route titles, detail panel headings.
- **Body** (400, 1rem, 1.6): Prose, listening notes, route copy, and explanatory text. Keep long prose near 65 to 75 characters per line on wide screens.
- **Label** (400, 0.76rem, 0.08em tracking): Kicker labels, year marks, metadata, and map annotations. Use uppercase Latin sparingly.

### Named Rules

**The Annotation Rule.** Labels should feel like map annotations: concise, placed with care, and never repeated as decorative filler.

**The No Costume Rule.** Do not use ornate fonts just because the subject is classical music.

## 4. Elevation

The system is flat by default. Depth is conveyed through paper tones, grid fields, borders, overlap, and focus rings. Shadows are reserved for the homepage atlas preview and interactive overlays.

### Shadow Vocabulary
- **Preview Lift** (`0 1rem 3rem oklch(26% 0.045 238 / 0.12)`): Used only for the homepage atlas panel or future floating composer previews.
- **Focus Halo** (`0 0 0 3px oklch(58% 0.1 24 / 0.15)`): Used for active composer bars and focus-adjacent emphasis.

### Named Rules

**The Flat Map Rule.** The timeline is a map, not a stack of cards. Depth supports inspection, it does not decorate the page.

## 5. Components

### Buttons
- **Shape:** Gently squared corners (`0.25rem`), never pill-heavy.
- **Primary:** Quiet Ink Blue background, Lifted Paper text, `2.75rem` minimum height, compact horizontal padding.
- **Hover / Focus:** Primary hover shifts to Concert Red. Focus uses a visible red outline outside the element.
- **Secondary / Ghost:** Transparent background, ink text, full border. Hover changes border and text to Concert Red.

### Chips
- **Style:** Map-control chips with Lifted Paper background, Soft Rule border, and Soft Ink text.
- **State:** Selected chips use Concert Red border/text and a pale red fill. Color is reinforced by text weight and outline, not used alone.

### Cards / Containers
- **Corner Style:** Same squared radius vocabulary as buttons.
- **Background:** Lifted Paper over Warm Paper.
- **Shadow Strategy:** No shadow except the homepage atlas preview. Route cards use border and movement instead.
- **Internal Padding:** Compact `1rem` padding, with larger spacing created by page layout rather than nested cards.

### Inputs / Fields
- **Style:** Search input uses Lifted Paper, Strong Rule border, and `2.75rem` height.
- **Focus:** The global focus ring appears outside the input with no layout shift.
- **Error / Disabled:** Not yet implemented. Future errors should state what happened and how to recover.

### Navigation
- **Style:** Quiet text navigation with no SaaS top-bar chrome. Active and hover states use Concert Red.
- **Mobile Treatment:** Main nav is hidden on narrow screens for this MVP; page-level actions remain visible in content.

### Timeline
- **Role:** Signature component and primary product surface.
- **Period Bands:** Muted color blocks from the period palette, always behind the data.
- **Composer Bars:** Real interactive buttons, positioned by birth and death year, with keyboard focus and click behavior.
- **Annotations:** Thin red connector marks and concise listening notes.
- **Mobile:** Timeline remains horizontally scrollable inside its own frame so the page itself does not become horizontally unstable.

## 6. Do's and Don'ts

### Do:
- **Do** make the timeline the dominant first-viewport object.
- **Do** preserve enough density for serious classical listeners.
- **Do** use period color as structured information.
- **Do** provide small listening cues for newcomers without lowering the tone.
- **Do** support Chinese and English names, long labels, keyboard access, and reduced motion.
- **Do** design interactions that can run from static assets and client-side data on GitHub Pages.
- **Do** use OKLCH tokens from the stylesheet as the design source of truth.

### Don't:
- **Don't** make it look like a generic streaming homepage.
- **Don't** use training-course sales language or anxiety-based beginner messaging.
- **Don't** turn the first screen into an encyclopedia database.
- **Don't** use gold trim, distressed paper, ornate borders, or heavy faux-antique styling.
- **Don't** use purple-blue gradients, glassmorphism, floating light blobs, gradient text, or template hero metrics.
- **Don't** use colored side-stripe borders as accents.
- **Don't** rely on server-only rendering, backend APIs, or runtime services for the core timeline experience.
