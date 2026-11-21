# Sharanga / DyslexiMate — UI/UX & Technical Improvement Recommendations

**Audit Date:** November 20, 2026  
**Auditor:** Senior Interaction Designer & Full-Stack Architect  

---

## 1. Architectural & Codebase Improvements

### 1.1 Deconstruct the Monolithic `Front_end/app.ts`
- **Current State:** `Front_end/app.ts` is over 5,800 lines long, combining routing, DOM templating, event handling, activity rendering, adventure maps, parent portal tabs, and chart generation.
- **Impact:** High cognitive load for developers, risk of accidental regressions when modifying individual features, and slower build/HMR iterations.
- **Recommendation:** Refactor into modular controllers and view components under `src/ui/`:
  - `src/ui/views/landingView.ts`
  - `src/ui/views/authView.ts`
  - `src/ui/views/parentPortalView.ts`
  - `src/ui/views/adventureView.ts`
  - `src/ui/views/storyReaderView.ts`
  - `src/ui/views/practiceCatalogView.ts`

### 1.2 Formalize ESLint & Code Formatting Pipeline
- **Current State:** `eslint` and `@eslint/js` are present in `devDependencies`, but no root `eslint.config.js` or `eslint.config.mjs` is configured.
- **Recommendation:** Add a modern flat ESLint configuration enforcing TypeScript strict typing, no unused imports, and consistent code formatting across team PINAKA contributors.

### 1.3 Offline PWA Caching for Dyslexia Reading Exercises
- **Current State:** The app relies on live network fetches or local memory. If a child travels or has poor connectivity, activities and stories may fail to load.
- **Recommendation:** Add a lightweight Service Worker using `vite-plugin-pwa` to cache core story passages, phoneme sound packs, and visual assets for offline play.

---

## 2. Accessibility & Neurodiversity UI Enhancements

### 2.1 Reading Line Ruler & Visual Focus Bar
- **Feature Concept:** Children with dyslexia frequently experience line jumping or track loss while reading dense passages.
- **Implementation:** Add an interactive "Reading Guide Ruler" to the Story Reader (`/#/stories`) that highlights the active line and softly masks surrounding text, controlled via mouse hover or finger touch on mobile.

### 2.2 Child-Friendly Touch Targets (WCAG 2.5.5)
- **Current State:** On mobile viewports (375 × 667 px), some activity choice pills and navigation buttons have touch targets around 36 × 36 px.
- **Recommendation:** Increase all child-facing interactive buttons and choice chips to a minimum of **48 × 48 px** with generous margin spacing (minimum 12 px) to prevent accidental taps from young learners.

### 2.3 Audio-Visual Feedback Synchrony
- **Current State:** Spoken TTS narration and sound effects run independently.
- **Recommendation:** Ensure visual word-level highlighting precisely synchronizes with the `SpeechSynthesisUtterance.onboundary` event or the backend Google Cloud TTS audio playback timestamps.

---

## 3. Performance & Core Web Vitals Optimization

### 3.1 Optimize Google Fonts Loading Strategy
- **Current State:** Multiple font families (*Atkinson Hyperlegible*, *DM Sans*, *Lexend*, *Nunito*) are requested simultaneously in `<head>`, causing an initial render delay of ~1.5s on mobile networks.
- **Recommendation:**
  1. Add `font-display: swap` to all Google Fonts stylesheets.
  2. Preload the primary child reading font (*Lexend* or *Atkinson Hyperlegible*) using `<link rel="preload" as="font" crossorigin>`.
  3. Subset font weights to 400 and 700 to reduce total font payload from ~450 KB down to ~120 KB.

### 3.2 Image Optimization & WebP Conversion
- **Current State:** The landing hero assets and logo graphics are served as PNG images (~1.2 MB full size).
- **Recommendation:** Convert landing hero graphics to compressed `.webp` or `.avif` formats with responsive `<picture>` srcset tags to reduce mobile bandwidth consumption by up to 70%.

---

## 4. UI Polish & Responsive Refinements

| Component | Viewport | Observed Deficiency | Recommended UX Enhancement |
| :--- | :--- | :--- | :--- |
| **Parent Portal Tabs** | Mobile (375px) | 4 tabs wrap onto two uneven rows, consuming vertical real estate. | Convert tabs into an horizontally scrollable pill row with smooth scroll snapping. |
| **Adventure Map** | Tablet (768px) | Destination cards display in a 1-column stack leaving empty space. | Use a responsive 2-column grid (`grid-template-columns: repeat(2, 1fr)`) with playful curved connecting paths. |
| **Story Reader** | All | Fixed font size adjustment steps (18px, 20px). | Provide a continuous slider (16px to 32px) and line-height toggle (1.5x, 1.8x, 2.2x). |
| **PIN Gate** | Mobile (375px) | PIN input field triggers alphanumeric keyboard on some Android devices. | Ensure `type="password" inputmode="numeric" pattern="[0-9]*"` is set for instant numeric keypad display. |
