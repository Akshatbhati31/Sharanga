# DyslexiMate 🧠📚
### Personalized Learning Support for Children with Dyslexia

**DyslexiMate** is an AI-powered learning-support platform designed to help children strengthen their reading, phonics, spelling, vocabulary, and comprehension skills through interactive activities and personalized learning experiences.

Every child learns differently. DyslexiMate aims to make learning more supportive by using previous activity results and learning progress to recommend appropriate exercises, revisit challenging concepts, and gradually adapt learning difficulty.

Our goal is to make reading practice more engaging, accessible, and personalized for every child.

---

## 👥 Meet Team PINAKA

We are **Team PINAKA**, a team collaborating to build technology-driven solutions for meaningful educational challenges.

| Team Member |
|---|
| Naynika Rani |
| Akshat Bhati |
| Yash Mishra |
| Sameer Raja |
| Shaivi Goel |

Together, we are developing DyslexiMate to explore how adaptive learning, artificial intelligence, and accessible design can support children in their learning journeys.

---

## ✨ Key Features

### 🧠 Adaptive AI Learning
- Personalized learning paths informed by previous activity results.
- Recommendations targeting skills that need additional practice.
- Gradual difficulty adjustments based on observed performance.
- AI-assisted activity generation where configured.
- Learning recommendations designed to evolve as the child progresses.

### 📈 Reading Progress Tracking
- Reading accuracy calculated from recorded attempts.
- Progress visualization across different time ranges.
- Learning-session history and activity tracking.
- Data-driven progress charts that reflect actual performance.
- Support for identifying skills that may benefit from additional practice.

### 🔤 Interactive Learning Activities
- **B/D Letter Mirror:** practice distinguishing lowercase `b` and `d`.
- Letter-sound association and sound blending.
- Word building and missing-letter exercises.
- Spelling and vocabulary practice.
- Rhyming and syllable exercises.
- Reading comprehension and listening activities.

### 👨‍👩‍👧 Parent Progress Insights
- Child learning profiles and progress summaries.
- Activity history and skill-level insights.
- Recommendations for future practice.
- Visibility into learning goals and areas needing further support, where implemented.

### 🌐 Educational Resource Discovery
- TinyFish integration for discovering relevant educational resources, when configured.
- Source links and resource information.
- Additional reading material to complement structured learning activities.

### ♿ Accessibility and Responsive Design
- Clear, uncluttered learning interfaces.
- Responsive layouts for mobile, tablet, laptop, and desktop.
- Supportive feedback during practice.
- Dyslexia-conscious reading experiences and accessibility preferences, where implemented.

---

## 🛠️ Technology Stack

The project uses the following technologies where configured in the current implementation:

- **TypeScript** — application logic and type safety.
- **Vite** — development server and production build tooling.
- **Supabase** — authentication, database, and persistent learning data where configured.
- **TinyFish** — educational resource discovery.
- **AI services** — assistance with learning activities and personalization where configured.
- **Cloudflare Workers** — application deployment and server-side functionality where configured.

---

## 🏗️ Project Structure

The repository includes application services, UI components, type definitions, styling, and database configuration. The structure may evolve as development continues.

```text
Sharanga/
├── src/
│   ├── services/
│   ├── types/
│   ├── ui/
│   └── styles/
├── supabase/
│   ├── migrations/
│   └── schema.sql
├── scripts/
├── package.json
├── vite.config.ts
├── wrangler.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Git
- A Supabase project, if persistent database features are required
- TinyFish API credentials, if live resource discovery is required
- Cloudflare authentication, if deploying through Wrangler

### 1. Clone the repository

```bash
git clone https://github.com/Akshatbhati31/Sharanga.git
cd Sharanga
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Configure the environment variables required by the existing application.

For local server-side TinyFish development, a local `.dev.vars` file may contain:

```env
TINYFISH_API_KEY=<your_tinyfish_api_key>
```

Replace the placeholder locally with your own credential. Never commit real credentials.

If Supabase or other AI services are enabled, configure their required variables according to the existing project implementation.

**Security rules:**
- Never commit `.dev.vars` or private `.env` files.
- Never expose API keys, database passwords, service-role keys, or private tokens in frontend code.
- Keep `.env.example` limited to variable names and placeholder values.
- Configure production secrets through the appropriate server-side environment.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed in the terminal, usually `http://localhost:5173/`.

### 5. Run tests

```bash
npm test
```

### 6. Create a production build

```bash
npm run build
```

Run only the scripts available in the project's `package.json`. External services may require additional configuration before their functionality can be tested.

---

## 🗄️ Database Configuration

Supabase can provide persistent storage for child profiles, learning progress, and practice-session history.

To configure it:

1. Create or select a Supabase project.
2. Configure the required environment variables.
3. Review the existing schema and migration files.
4. Apply the appropriate migrations.
5. Verify authentication and Row Level Security policies.
6. Test that each child can access only their authorized learning data.

Persistent personalization depends on the database being correctly configured and connected.

---

## ☁️ Deployment

The project supports deployment through Cloudflare Workers using its Wrangler configuration, where configured.

Authenticate with Cloudflare:

```bash
npx wrangler login
```

Build the application:

```bash
npm run build
```

Deploy using the project's existing configuration:

```bash
npx wrangler deploy
```

Configure required server-side secrets in the appropriate Cloudflare environment before enabling integrations that depend on them. Never include actual secret values in this README or in source control.

---

## 🔐 Privacy and Responsible AI

DyslexiMate is intended to support learning. It does not diagnose dyslexia or replace qualified educators, reading specialists, or healthcare professionals.

Our development priorities include:

- Protecting children's learning records through appropriate access controls.
- Collecting only information necessary for the learning experience.
- Validating AI-generated content for age-appropriateness and correctness.
- Reflecting actual learning attempts rather than fabricating progress.
- Treating speech-recognition results cautiously.
- Respecting educational resource attribution and applicable access restrictions.
- Providing helpful feedback without shaming or discouraging children.

---

## 🗺️ Future Improvements

Potential areas for continued development include:

- More personalized reading and phonics exercises.
- Improved mastery estimation and spaced revision.
- Expanded Hindi and English learning support.
- Enhanced parent and teacher reporting.
- More educational stories and reading resources.
- Additional accessibility and offline-learning features.
- Broader automated testing and usability validation.

These are development goals and should not be interpreted as completed features unless implemented.

---

## 🤝 Contributing

We welcome ideas, feedback, and contributions that improve the learning experience.

1. Create a feature branch.
2. Make focused changes.
3. Run relevant tests and the production build.
4. Review changes for security and regressions.
5. Submit a pull request describing the improvements.

---

## 📄 License

A license has not been specified in this README. Add the project's chosen license before distributing it under an open-source license.

---

**DyslexiMate — Every child deserves a learning path that adapts to them.**

**Built with care by Team PINAKA.**
