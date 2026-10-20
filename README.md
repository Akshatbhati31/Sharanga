# DyslexiMate (Sharanga)

DyslexiMate is a multilingual, voice-first reading companion designed for children with dyslexia-related reading difficulties. It offers parent-controlled learning profiles, gentle interactive exercises, and accessible reading tools.

---

## Key Features

- **Parent-Controlled Child Accounts:**
  - Secure parent authentication with email and password (salted SHA-256 hash verifier, no plaintext secrets).
  - Parent-child ownership enforcement: child profiles belong strictly to their authenticated parent.
- **"Who's learning today?" Profile Selector:**
  - Child-friendly avatar cards with class/grade and preferred learning language (English, Hindi, Punjabi, Bengali).
  - Seamless child switching without logging out of the parent account.
- **Grown-Ups Only Parent PIN Gate:**
  - 4-digit Parent PIN protection for parent settings, profile editing, and deletion.
  - Attempt-limiting security with 30-second lockout cooldowns after repeated incorrect attempts.
  - Secure PIN creation and change workflows.
- **Child Activity-Time Tracking & Telemetry:**
  - Real-time active learning duration tracking across practice games, voice spelling, Story Shelf, letter mirror, and general exploration.
  - Background tab visibility listeners and 60-second idle detection to avoid inflated session durations.
  - Parent Dashboard usage reports (Today, Last 7 Days, Last 30 Days) with category breakdowns and daily practice histograms.
- **Accessible Learning Engine:**
  - Interactive picture-word matching and speech synthesis read-aloud.
  - Dyslexia-adapted font spacing mode (custom letter/word spacing and line heights).
  - Isolated per-child progress data (happy points, practice time, words learned, fluency WPM).

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)

### Installation

```bash
npm install
```

### Development Server

Start the local development server:

```bash
npm run dev
```

The application runs locally at `http://localhost:5173/`.

### Testing & Verification

Run the automated test suite (verifying authentication, PIN security, profile CRUD, and activity tracking):

```bash
npm test
```

### Type Checking & Production Build

```bash
npm run typecheck
npm run build
```
