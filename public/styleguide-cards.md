# Card Design Options – Style Guide

## Overview
Three interchangeable card designs are provided to elevate visual appeal while maintaining branding consistency and WCAG 2.1 AA compliance.

## Option A – Minimalist
- **Classes:** `.card-a`, `.card-a-icon`, `.card-a-metric`, `.card-a-meta`
- **Usage:** Add `card-a` to existing `.bin-card` or `.contractor-card` class lists.
- **Features:**
  - Centered icon (24px) + bold metric
  - Single-line meta below metric
  - Clean hover lift with accent border
  - Focus-visible outline with glow
  - Print-friendly: suppress gradients/shadows, keep text/icons

## Option B – Compact Grid with Status Bars
- **Classes:** `.card-b`, `.card-b-header`, `.card-b-title`, `.card-b-status-bar`, `.card-b-status-fill`, `.card-b-meta`
- **Usage:** Add `card-b` to existing `.bin-card` or `.contractor-card`.
- **Features:**
  - Horizontal status/vehicle bar with percentage fill
  - Compact padding (12px) and tighter grid (gap 8px)
  - Bold titles; bar colors match status thresholds
  - Same hover/focus behavior as Option A
  - Print-friendly styles inherited

## Option C – Enhanced with Subtle Gradients
- **Classes:** `.card-c`, `.card-c-icon-wrapper`, `.card-c-icon`, `.card-c-title`, `.card-c-meta`
- **Usage:** Add `card-c` to existing `.bin-card` or `.contractor-card`.
- **Features:**
  - Subtle vertical gradient background
  - Top accent border that appears on hover
  - Larger icon with circular background
  - Slightly deeper hover lift and shadow
  - Focus-visible with stronger glow
  - Print-friendly: removes gradients/shadows

## Shared Standards (All Options)
- **Color tokens:** Use existing `--accent`, `--success`, `--text`, `--border`, `--card`.
- **Typography:** Same font stack; titles 13–14px; meta 11px; maintain contrast ratios.
- **Spacing & Sizing:** Unified padding/gap per option; responsive breakpoints unchanged.
- **Accessibility:** `role=listitem`; `aria-live` containers; `focus-visible` outlines; contrast ≥ 4.5:1.
- **Print:** All options include `@media print` rules to ensure text/icons print clearly.

## How to Apply
```css
/* Smart Bins example – switch Option B */
.bins-grid .bin-card {
  composes: card-b;
}
/* Contractors example – switch Option A */
.contractors-list .contractor-card {
  composes: card-a;
}
```

## Demo Classes
For quick review, use demo overrides:
- `.demo-card-a`, `.demo-card-b`, `.demo-card-c` on the container (`.bins-grid` or `.contractors-list`) to preview each option.

## Files
- `styles-cards.css`: All three design definitions and print styles.
- `cards-demo.css`: Demo utility classes to toggle options without modifying component classes.
- `styleguide.md`: This documentation.

## Visuals
![Option A – Minimalist](https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Minimalist%20card%20with%20large%20icon%2C%20bold%20metric%2C%20single%20meta%20line%2C%20centered%20text%2C%20hover%20lift%2C%20dark%20UI%20blue%20accent%2C%20clean%20typography%2C%20WCAG%20AA%20contrast.%20SDXL%20style%2C%20UI%20mock%20screenshot&image_size=landscape_16_9)
![Option B – Compact Status Bars](https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Compact%20grid%20card%20with%20horizontal%20status%20bar%2C%20percentage%20fill%2C%20bold%20title%2C%20tight%20spacing%2C%20dark%20UI%20blue%20accent%2C%20visual%20hierarchy.%20SDXL%20style%2C%20UI%20mock%20screenshot&image_size=landscape_16_9)
![Option C – Enhanced Gradients](https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Enhanced%20card%20with%20subtle%20vertical%20gradient%20background%2C%20top%20accent%20border%20on%20hover%2C%20larger%20icon%20in%20circle%2C%20deeper%20lift%2C%20focus%20glow%2C%20dark%20UI%20blue%20accent.%20SDXL%20style%2C%20UI%20mock%20screenshot&image_size=landscape_16_9)