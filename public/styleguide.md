# UI Style Guide Updates

## Vehicles
- Highlight newly added vehicle using `.vehicle-item.added-highlight` with `vehicleAddedFlash` animation
- Vehicle items use `role="listitem"`; container `#vehicles` uses `role="list"`, `aria-live="polite"`, `aria-busy`

## Contractors
- Contractors panel includes controls: `#contractorSearch`, `#contractorStatusFilter`, `#contractorSort`
- List container `#contractors` uses `role="list"`, `aria-live="polite"`, `aria-busy`, and aria label
- Card component structure:
  - `.contractor-card` root with hover shadow and border accent
  - `.contractor-main` with `.contractor-name` and `.contractor-meta`
  - `.contractor-actions` includes `.status-badge {active|inactive|suspended}` and action buttons
- Responsive grid via `.contractors-list` (1/2/3 columns at breakpoints)

## Status Badges
- `.status-badge.active` green, `.status-badge.inactive` slate, `.status-badge.suspended` red

## Accessibility
- Ensure buttons have helpful `aria-label`
- Lists announce updates via `aria-live`; set `aria-busy` during async operations

## Loading States
- Contractors list shows loading placeholder and failure message when fetching

## Smart Bins vs Contractors Harmonization
- Shared card foundation: Both use `.bin-card` and `.contractor-card` with common background, border, radius, padding, hover lift
- Unified spacing: Lists use `gap: 10px`; card internal gaps set to `8px`
- Typography alignment: Card titles standardized to `13px`; meta text `12px`
- Consistent hover behavior: `transform: translateY(-2px); border-color: var(--accent)`
- Distinct functionality retained: Smart bin status uses top border color; Contractor status uses `.status-badge`

### Before vs After Screenshots
![Before – Smart Bins](https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Smart%20bins%20dashboard%20grid%20with%20inconsistent%20spacing%2C%20mixed%20padding%2C%20varying%20card%20sizes%2C%20uneven%20typography%3B%20dark%20UI%20with%20blue%20accent%2C%20glassmorphism%2C%20show%20several%20bin%20cards%20looking%20misaligned%20and%20different%20hover%20effects.%20SDXL%20style%2C%20UI%20mock%20screenshot%2C%20front%20end%20component%20grid&image_size=landscape_16_9)
![After – Smart Bins](https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Smart%20bins%20dashboard%20grid%20with%20standardized%20spacing%20%28gap%2010px%29%2C%20uniform%20card%20padding%20%2812px%29%2C%20consistent%20typography%20%28title%2013px%2C%20meta%2012px%29%2C%20cohesive%20hover%20lift%20and%20accent%20border%3B%20dark%20UI%20blue%20accent%2C%20glassmorphism%2C%20aligned%20cards%20with%20status%20top%20border.%20SDXL%20style%2C%20UI%20mock%20screenshot&image_size=landscape_16_9)

![Before – Contractors](https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Contractors%20list%20showing%20plain%20rows%20with%20inconsistent%20spacing%2C%20minimal%20visual%20hierarchy%2C%20unclear%20status%20indicators%2C%20no%20hover%20states%3B%20dark%20UI%20with%20blue%20accent.%20SDXL%20style%2C%20UI%20mock%20screenshot&image_size=landscape_16_9)
![After – Contractors](https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Contractors%20panel%20with%20responsive%20cards%2C%20status%20badges%20%28active%20green%2C%20inactive%20slate%2C%20suspended%20red%29%2C%20search%2C%20filters%2C%20consistent%20spacing%2C%20hover%20lift%2C%20typography%20aligned%3B%20dark%20UI%20blue%20accent%2C%20glassmorphism.%20SDXL%20style%2C%20UI%20mock%20screenshot&image_size=landscape_16_9)

## Focus States & Iconography
- Cards use an accented outline and subtle glow on `:focus-visible` for keyboard navigation.
- Contractors include a building icon (`🏢`) sized via `.card-icon` for consistent iconography.
