# Sharanga / DyslexiMate — Performance & Core Web Vitals Benchmark Report

**Audit Date:** November 20, 2026  
**Auditor:** Senior Performance Engineer & Web Vitals Specialist  
**Tooling:** Google Lighthouse 13.6.0 (Headless Chromium), DevTools Performance Profiler  
**Targets Audited:**
- **Local Dev Server:** `http://localhost:5173/`
- **Production Deployment:** `https://sharanga.vercel.app/`

---

## 1. Executive Summary

Performance evaluations were performed across both local development and live production environments using automated Lighthouse CLI test runners. 

DyslexiMate demonstrates **exceptional Best Practices (96–100/100)**, **strong Accessibility (94/100)**, and **solid SEO (91/100)**. The overall **Performance score ranges between 80 and 85/100**, driven by zero layout shifts (`CLS: 0`) and rapid server edge caching on Vercel's global CDN (`x-vercel-cache: HIT`).

The primary performance opportunities center around **JavaScript bundle size (~1.04 MB)**, **Total Blocking Time (TBT)** during initial hydration, and **Google Fonts network blocking**.

---

## 2. Lighthouse Scorecard Comparison

| Audit Category | Local Development (`localhost:5173`) | Live Production (`sharanga.vercel.app`) | Industry Benchmark | Rating |
| :--- | :--- | :--- | :--- | :--- |
| **Performance** | **80 / 100** | **85 / 100** | ≥ 90 | Good |
| **Accessibility** | **94 / 100** | **94 / 100** | ≥ 90 | **Excellent** |
| **Best Practices** | **100 / 100** | **96 / 100** | ≥ 90 | **Excellent** |
| **SEO** | **91 / 100** | **91 / 100** | ≥ 90 | **Excellent** |

---

## 3. Core Web Vitals & Loading Metrics

| Web Vital Metric | Local Dev Value | Production Value | Target Threshold (Good) | Assessment |
| :--- | :--- | :--- | :--- | :--- |
| **First Contentful Paint (FCP)** | 1.5 s | 3.1 s | ≤ 1.8 s | Moderate (Needs Font Preload) |
| **Largest Contentful Paint (LCP)** | 1.5 s | 3.1 s | ≤ 2.5 s | Needs Optimization |
| **Total Blocking Time (TBT)** | 830 ms | 170 ms | ≤ 200 ms | **Excellent on Prod (170ms)** |
| **Cumulative Layout Shift (CLS)** | **0.000** | **0.000** | ≤ 0.10 | **Perfect Stability** |
| **Speed Index (SI)** | 2.3 s | 4.1 s | ≤ 3.4 s | Acceptable |

> **Key Observation:** The production deployment on Vercel achieves an outstanding **Total Blocking Time of 170 ms** (well below the 200 ms green threshold) and a **perfect 0.000 CLS**, indicating rock-solid visual stability during render without annoying jumps or shifts for children.

---

## 4. Bundle & Asset Payload Analysis

Inspecting the production build output in `Front_end/dist`:

| Asset File | Type | Uncompressed Size | Gzipped / Brotli Estimate | Analysis |
| :--- | :--- | :--- | :--- | :--- |
| `index-vbzQrbjh.js` | JavaScript | **1,042 KB (1.04 MB)** | ~285 KB | Main application bundle containing all modules, i18n dictionaries, and Supabase client |
| `dysleximate-logo-VsFh-xTS.png` | Image | **212 KB** | ~210 KB | High-res PNG logo; prime candidate for WebP/AVIF compression |
| `index-D4ypnTgF.css` | Stylesheet | **45 KB** | ~9.5 KB | Highly efficient CSS payload; includes full theme and typography rules |
| `index.html` | Markup | **1.18 KB** | ~0.5 KB | Minimal DOM shell; SPA entry point |
| **Total First Load Payload** | **1.30 MB** | **~505 KB** | Target: < 400 KB |

---

## 5. Performance Bottlenecks & Diagnostic Details

### 5.1 Monolithic Single-Bundle Delivery
- **Diagnosis:** Vite bundles the entire application (`Front_end/app.ts`, all 6 language dictionaries, activity models, and services) into a single 1.04 MB JavaScript file.
- **Consequence:** Users downloading the English landing page also download full dictionaries for Bengali, Tamil, Odia, Hindi, and Punjabi, as well as the entire Parent Portal and Adventure Engine before anything renders.
- **Optimization:** Implement dynamic imports (`import()`) for:
  - Non-active locale files: `await import('./locales/bn.js')`
  - Parent Portal view: `await import('./views/parentDashboard.js')`
  - Expected bundle reduction for landing page: **60% smaller (from 1.04 MB down to ~410 KB)**.

### 5.2 Google Web Fonts Chained Requests
- **Diagnosis:** `index.html` loads 4 distinct font families (*Atkinson Hyperlegible*, *DM Sans*, *Lexend*, *Nunito*) across multiple weights without `font-display: swap`.
- **Consequence:** Text rendering is delayed by up to 1.5s on slower 3G/4G connections until external web fonts complete downloading.
- **Optimization:** Add `&display=swap` to the Google Fonts link and preload the critical reading font:
  ```html
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap" />
  ```

### 5.3 Static Asset Compression
- **Diagnosis:** `dysleximate-logo-VsFh-xTS.png` is served as raw 212 KB PNG.
- **Optimization:** Convert to WebP format (`cwebp -q 85 logo.png -o logo.webp`), reducing size to ~38 KB (an 82% bandwidth saving).

---

## 6. Actionable Performance Checklist

- [ ] Split locale translation bundles using dynamic ES module imports.
- [ ] Add `font-display: swap` and link preloading for the primary dyslexia-friendly font.
- [ ] Convert hero logos and graphics to `.webp` format.
- [ ] Enable Vercel gzip/brotli static asset pre-compression in build scripts.
- [ ] Set `Cache-Control: public, max-age=31536000, immutable` for hashed static assets in `vercel.json`.
