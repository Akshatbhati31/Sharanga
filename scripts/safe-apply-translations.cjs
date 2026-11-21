const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appPath = path.join(__dirname, '..', 'Front_end', 'app.ts');
let app = fs.readFileSync(appPath, 'utf8');

// List of target replacements
const replacements = [
  // Rights Footer
  {
    target: `function rightsFooter(): string {
  return \`
    <div class="rights-footer">
      <strong>Rights &amp; attribution</strong>
      <p>© \${new Date().getFullYear()} Team PINAKA. All rights reserved. The DyslexiMate name, logo, and original app materials may not be copied or redistributed without permission. Educational support tool — not a clinical diagnostic instrument.</p>
      <a href="mailto:team.nexus.dtu.26.30@gmail.com">Contact Team PINAKA</a>
    </div>\`;
}`,
    replacement: `function rightsFooter(): string {
  return \`
    <div class="rights-footer">
      <strong>\${t('landing.rightsAttribution')}</strong>
      <p>\${t('landing.rightsNotice')}</p>
      <a href="mailto:team.nexus.dtu.26.30@gmail.com">\${t('landing.contactTeam')}</a>
    </div>\`;
}`
  },
  // Nav Links
  {
    target: `<a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">Why DyslexiMate</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">Activities</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">Interactive Reader</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">Adaptive AI</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">Team PINAKA</a>`,
    replacement: `<a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">\${t('landing.navWhy')}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">\${t('landing.navActivities')}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">\${t('landing.navReader')}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">\${t('landing.navAdaptive')}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">\${t('landing.navTeam')}</a>`
  },
  // Mobile Nav Drawer Links
  {
    target: `<a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">Why DyslexiMate</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">Curated Activities</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">Interactive Reader Playground</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">Adaptive AI Architecture</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">Meet Team PINAKA</a>`,
    replacement: `<a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">\${t('landing.navWhy')}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">\${t('landing.navActivities')}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">\${t('landing.navReader')}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">\${t('landing.navAdaptive')}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">\${t('landing.navTeam')}</a>`
  },
  // Nav buttons in landing header
  {
    target: `<button type="button" class="btn btn-ghost btn-sm" data-action="open-auth" data-mode="login">
              Parent Sign In
            </button>
            <button type="button" class="btn btn-primary btn-sm" data-action="launch-demo">
              🚀 Launch Demo
            </button>`,
    replacement: `<button type="button" class="btn btn-ghost btn-sm" data-action="open-auth" data-mode="login">
              \${t('landing.navParentSignIn')}
            </button>
            <button type="button" class="btn btn-primary btn-sm" data-action="launch-demo">
              \${t('landing.navInstantDemo')}
            </button>`
  },
  // Hero Badge
  {
    target: `<span>✦</span> AI-POWERED MULTISENSORY LEARNING · AGES 5-12`,
    replacement: `<span>✦</span> \${t('landing.badge')}`
  },
  // Hero Title
  {
    target: `Little steps. Big reading wins for <span class="highlight-teal">every curious mind.</span>`,
    replacement: `\${t('landing.heroTitle')}`
  },
  // Hero Subtitle
  {
    target: `A gentle, science-backed learning companion designed for children navigating dyslexia and reading hurdles. Combining multisensory phonics, adaptive AI pacing, speech synthesis, and parent-governed confidence.`,
    replacement: `\${t('landing.heroSubtitle')}`
  },
  // Hero CTA buttons
  {
    target: `<button type="button" class="btn btn-primary btn-lg" data-action="launch-demo">
                🚀 Launch Interactive Demo <span>→</span>
              </button>
              <button type="button" class="btn btn-outline btn-lg" data-action="open-auth" data-mode="login">
                👨‍👩‍👧 Parent &amp; Guardian Space
              </button>`,
    replacement: `<button type="button" class="btn btn-primary btn-lg" data-action="launch-demo">
                \${t('landing.btnTryDemo')}
              </button>
              <button type="button" class="btn btn-outline btn-lg" data-action="open-auth" data-mode="login">
                \${t('landing.btnParentAccess')}
              </button>`
  },
  // 4 Pillars Header
  {
    target: `<span class="section-badge">PEDAGOGICAL FOUNDATION</span>
            <h2 class="section-title">Designed for how neurodivergent minds actually learn.</h2>
            <p class="section-desc">
              Traditional drills often induce anxiety. DyslexiMate integrates Orton-Gillingham multisensory principles into low-stress, engaging digital experiences.
            </p>`,
    replacement: `<span class="section-badge">\${t('landing.adaptiveBadge')}</span>
            <h2 class="section-title">\${t('landing.adaptiveTitle')}</h2>
            <p class="section-desc">
              \${t('landing.adaptiveSubtitle')}
            </p>`
  },
  // Pillar 1
  {
    target: `<h3>Multisensory Structured Phonics</h3>
              <p>Simultaneously connects visual graphemes, auditory phonemes, and verbal pronunciation. Helps anchor memory paths naturally.</p>`,
    replacement: `<h3>\${t('landing.card1Title')}</h3>
              <p>\${t('landing.card1Desc')}</p>`
  },
  // Pillar 2
  {
    target: `<h3>Zero-Frustration Adaptive Pacing</h3>
              <p>The system recalibrates in real time. If a child hesitates, it offers supportive step-by-step hints instead of red crosses or negative penalization.</p>`,
    replacement: `<h3>\${t('landing.card2Title')}</h3>
              <p>\${t('landing.card2Desc')}</p>`
  },
  // Pillar 3
  {
    target: `<h3>Voice-First &amp; Native Mother Tongue</h3>
              <p>Built with native speech synthesis across English, Hindi, Bengali, Punjabi, Tamil, and Odia. Children listen, repeat, and build genuine fluency.</p>`,
    replacement: `<h3>\${t('landing.card3Title')}</h3>
              <p>\${t('landing.card3Desc')}</p>`
  },
  // Pillar 4
  {
    target: `<h3>Parent-Governed Transparency</h3>
              <p>100% child-safe and privacy-first. Parents monitor true learning metrics calculated from real recorded attempts — never fabricated gamification.</p>`,
    replacement: `<h3>\${t('landing.card4Title')}</h3>
              <p>\${t('landing.card4Desc')}</p>`
  },
  // Interactive Reader Header
  {
    target: `<span class="section-badge">TEST IT YOURSELF</span>
            <h2 class="section-title">Experience assistive reading tools in real-time.</h2>
            <p class="section-desc">
              Test how typography, syllable chunking, line rulers, and text-to-speech alleviate ocular strain and boost comprehension.
            </p>`,
    replacement: `<span class="section-badge">\${t('landing.interactiveBadge')}</span>
            <h2 class="section-title">\${t('landing.interactiveTitle')}</h2>
            <p class="section-desc">
              \${t('landing.interactiveSubtitle')}
            </p>`
  },
  // Team PINAKA Header
  {
    target: `<span class="section-badge">MEET TEAM PINAKA</span>
            <h2 class="section-title">Built with empathy by Team PINAKA.</h2>
            <p class="section-desc">
              We are a passionate team dedicated to leveraging technology for educational accessibility, equity, and neurodivergent empowerment.
            </p>`,
    replacement: `<span class="section-badge">\${t('landing.teamBadge')}</span>
            <h2 class="section-title">\${t('landing.teamTitle')}</h2>
            <p class="section-desc">
              \${t('landing.teamSubtitle')}
            </p>`
  },
  // FAQ Header
  {
    target: `<span class="section-badge">COMMONLY ASKED QUESTIONS</span>
            <h2 class="section-title">Everything you need to know about DyslexiMate.</h2>
            <p class="section-desc">
              Clear answers to common questions from parents, guardians, and educators.
            </p>`,
    replacement: `<span class="section-badge">\${t('landing.faqBadge')}</span>
            <h2 class="section-title">\${t('landing.faqTitle')}</h2>
            <p class="section-desc">
              \${t('landing.faqSubtitle')}
            </p>`
  },
  // Progress Page Header
  {
    target: `<span>HALL OF ACHIEVEMENTS · \${escapeHtml(child.name)}'s Trophy Room</span>`,
    replacement: `<span>\${t('progress.hallOfAchievements', { name: escapeHtml(child.name) })}</span>`
  },
  {
    target: `<h2 class="realm-title">
              Superpowers & Milestone Trophies!
            </h2>`,
    replacement: `<h2 class="realm-title">
              \${t('progress.trophyRoomTitle')}
            </h2>`
  },
  {
    target: `<p class="realm-desc">
              🦉 Hootie cheers: "Look how far you've come! Every quest you play makes your reading superpowers shine brighter!"
            </p>`,
    replacement: `<p class="realm-desc">
              \${t('progress.hootieCheer')}
            </p>`
  },
  // Progress Stars & Points
  {
    target: `<span>\${mapState.totalStars} Stars Earned</span>`,
    replacement: `<span>\${t('progress.starsEarned', { count: String(mapState.totalStars) })}</span>`
  },
  {
    target: `<span>\${progress.happyPoints || 0} Happy Points</span>`,
    replacement: `<span>\${t('progress.happyPoints', { count: String(progress.happyPoints || 0) })}</span>`
  },
  {
    target: `<span>\${totalLevelsMastered} / 15 Levels Won</span>`,
    replacement: `<span>\${t('progress.levelsWon', { count: String(totalLevelsMastered) })}</span>`
  },
  // Progress Pedestals
  {
    target: `<span class="pedestal-label">Practice Time</span>
            <strong class="pedestal-val">\${progress.practiceMinutes} <small>min</small></strong>
            <small class="pedestal-sub sub-blue">+18% from last week</small>`,
    replacement: `<span class="pedestal-label">\${t('progress.practiceTimeCard')}</span>
            <strong class="pedestal-val">\${progress.practiceMinutes} <small>\${t('progress.minutesUnit')}</small></strong>
            <small class="pedestal-sub sub-blue">\${t('progress.weekComparison')}</small>`
  },
  {
    target: `<span class="pedestal-label">Words Mastered</span>
            <strong class="pedestal-val">\${wordsLearned} <small>words</small></strong>
            <small class="pedestal-sub sub-green">12 new this week</small>`,
    replacement: `<span class="pedestal-label">\${t('progress.wordsMasteredCard')}</span>
            <strong class="pedestal-val">\${wordsLearned} <small>\${t('progress.wordsUnit')}</small></strong>
            <small class="pedestal-sub sub-green">\${t('progress.newThisWeek')}</small>`
  },
  {
    target: `<span class="pedestal-label">Reading Speed</span>
            <strong class="pedestal-val">\${progress.readingSpeedWpm || 68} <small>WPM</small></strong>
            <small class="pedestal-sub sub-purple">Gentle &amp; growing pace</small>`,
    replacement: `<span class="pedestal-label">\${t('progress.readingSpeedCard')}</span>
            <strong class="pedestal-val">\${progress.readingSpeedWpm || 68} <small>\${t('progress.wpmUnit')}</small></strong>
            <small class="pedestal-sub sub-purple">\${t('progress.speedProgress')}</small>`
  },
  // Superpower Trophies Section Header
  {
    target: `<h3 class="open-section-title">Superpower Trophies</h3>
            <p class="open-section-desc">
              Earn medals as you practice letters, sounds, words, and stories across adventure destinations.
            </p>`,
    replacement: `<h3 class="open-section-title">\${t('progress.superpowerTrophies')}</h3>
            <p class="open-section-desc">
              \${t('progress.superpowerTrophiesDesc')}
            </p>`
  },
  // Recent Quest Sessions
  {
    target: `<h3 class="open-section-title">Recent Quest Sessions</h3>
            <p class="open-section-desc">
              Your latest practice challenges and achievements.
            </p>`,
    replacement: `<h3 class="open-section-title">\${t('progress.recentActivity')}</h3>
            <p class="open-section-desc">
              \${t('progress.recentActivityDesc')}
            </p>`
  },
  // Achievement Items
  {
    target: `title: 'Word Explorer',
      icon: '🧭',
      category: 'Vocabulary Power',
      description: 'Collect decodable words and master new sounds across realms.',`,
    replacement: `title: t('progress.wordExplorerTitle') || 'Word Explorer',
      icon: '🧭',
      category: 'Vocabulary Power',
      description: t('progress.wordExplorerDesc') || 'Collect decodable words and master new sounds across realms.',`
  },
  {
    target: `title: 'Reading Champion',
      icon: '🏆',
      category: 'Practice Momentum',
      description: 'Build daily reading habits with active challenge quests.',`,
    replacement: `title: t('progress.readingChampionTitle') || 'Reading Champion',
      icon: '🏆',
      category: 'Practice Momentum',
      description: t('progress.readingChampionDesc') || 'Build daily reading habits with active challenge quests.',`
  },
  {
    target: `title: 'Spelling Star',
      icon: '⭐',
      category: 'Phonetic Accuracy',
      description: 'Reach awesome reading accuracy on challenges and words.',`,
    replacement: `title: t('progress.spellingStarTitle') || 'Spelling Star',
      icon: '⭐',
      category: 'Phonetic Accuracy',
      description: t('progress.spellingStarDesc') || 'Reach awesome reading accuracy on challenges and words.',`
  },
  {
    target: `title: 'Sound Detective',
      icon: '🔍',
      category: 'Acoustic Mastery',
      description: 'Solve tricky sound clues in Alphabet Forest & Sound Safari.',`,
    replacement: `title: t('progress.soundDetectiveTitle') || 'Sound Detective',
      icon: '🔍',
      category: 'Acoustic Mastery',
      description: t('progress.soundDetectiveDesc') || 'Solve tricky sound clues in Alphabet Forest & Sound Safari.',`
  },
  {
    target: `title: 'Word Wizard',
      icon: '🧙‍♂️',
      category: 'Digraph & Blend Sorcery',
      description: 'Defeat tricky letter traps in Word Wonderland & Spelling Castle.',`,
    replacement: `title: t('progress.wordWizardTitle') || 'Word Wizard',
      icon: '🧙‍♂️',
      category: 'Digraph & Blend Sorcery',
      description: t('progress.wordWizardDesc') || 'Defeat tricky letter traps in Word Wonderland & Spelling Castle.',`
  },
  {
    target: `title: 'Story Royalty',
      icon: '👑',
      category: 'Royal Comprehension',
      description: 'Conquer Rhyme River and claim the Storybook Kingdom crown.',`,
    replacement: `title: t('progress.storyRoyaltyTitle') || 'Story Royalty',
      icon: '👑',
      category: 'Royal Comprehension',
      description: t('progress.storyRoyaltyDesc') || 'Conquer Rhyme River and claim the Storybook Kingdom crown.',`
  },
  // Profile Selection Buttons
  {
    target: `<a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🌐 View Website
          </a>`,
    replacement: `<a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🌐 \${t('nav.backToWebsite')}
          </a>`
  },
  {
    target: `<a href="#/parent" class="btn btn-outline btn-sm" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🛡️ Parent Dashboard
          </a>`,
    replacement: `<a href="#/parent" class="btn btn-outline btn-sm" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🛡️ \${t('profileSelect.parentDash')}
          </a>`
  },
  {
    target: `<button type="button" class="btn btn-ghost btn-sm" data-action="logout">
            Sign out
          </button>`,
    replacement: `<button type="button" class="btn btn-ghost btn-sm" data-action="logout">
            \${t('common.logOut')}
          </button>`
  }
];

let applied = 0;
for (const { target, replacement } of replacements) {
  // Normalize target and replacement line endings to match app
  const normTarget = target.replace(/\r?\n/g, '\n');
  const appNorm = app.replace(/\r\n/g, '\n');

  if (appNorm.includes(normTarget)) {
    const replacedNorm = appNorm.replace(normTarget, replacement.replace(/\r?\n/g, '\n'));
    app = replacedNorm.replace(/\n/g, '\r\n');
    applied++;
  } else {
    console.warn('Target not found:', normTarget.substring(0, 50));
  }
}

// Add select-landing-language action routing if missing
if (!app.includes("action === 'select-landing-language'")) {
  const selectLangActionCode = `    } else if (action === 'select-landing-language') {
      const targetCode = (control.dataset.langCode || 'en') as AppLanguageCode;
      customLangMenuOpen = false;
      await i18n.setLanguage(targetCode);
      const user = auth.getCurrentUser();
      if (user) {
        await auth.updateInterfaceLanguage(targetCode);
      }
      toast(\`Language set to \${i18n.getCurrentMeta().nativeName} 🌐\`);
      await renderAppPage();`;

  app = app.replace(
    "} else if (action === 'select-app-language') {",
    selectLangActionCode + "\n    } else if (action === 'select-app-language') {"
  );
  applied++;
}

fs.writeFileSync(appPath, app, 'utf8');
console.log(`Applied ${applied} replacements to Front_end/app.ts`);
