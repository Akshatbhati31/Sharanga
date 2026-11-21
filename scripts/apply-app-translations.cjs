const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'Front_end', 'app.ts');
let app = fs.readFileSync(appPath, 'utf8');
const isCrlf = app.includes('\r\n');
if (isCrlf) {
  app = app.replace(/\r\n/g, '\n');
}

// 1. Update rightsFooter
const oldRights = `function rightsFooter(): string {
  return \`
    <div class="rights-footer">
      <strong>Rights &amp; attribution</strong>
      <p>© \${new Date().getFullYear()} Team PINAKA. All rights reserved. The DyslexiMate name, logo, and original app materials may not be copied or redistributed without permission. Educational support tool — not a clinical diagnostic instrument.</p>
      <a href="mailto:team.nexus.dtu.26.30@gmail.com">Contact Team PINAKA</a>
    </div>\`;
}`;

const newRights = `function rightsFooter(): string {
  return \`
    <div class="rights-footer">
      <strong>\${t('landing.rightsAttribution') || 'Rights & attribution'}</strong>
      <p>\${t('landing.rightsNotice') || \`© \${new Date().getFullYear()} Team PINAKA. All rights reserved. The DyslexiMate name, logo, and original app materials may not be copied or redistributed without permission. Educational support tool — not a clinical diagnostic instrument.\`}</p>
      <a href="mailto:team.nexus.dtu.26.30@gmail.com">\${t('landing.contactTeam') || 'Contact Team PINAKA'}</a>
    </div>\`;
}`;

app = app.replace(
  /function rightsFooter\(\): string \{[\s\S]*?return `[\s\S]*?<\/div>`;\n\}/,
  newRights
);

// 2. Add language switcher to renderLandingPage header and update nav strings
const oldNavSearch = `<nav class="site-nav-links" aria-label="Main Navigation">
          <a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">Why DyslexiMate</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">Activities</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">Interactive Reader</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">Adaptive AI</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">Team PINAKA</a>
        </nav>`;

const newNavReplace = `<nav class="site-nav-links" aria-label="Main Navigation">
          <a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">\${t('landing.navWhy') || 'Why DyslexiMate'}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">\${t('landing.navActivities') || 'Activities'}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">\${t('landing.navReader') || 'Interactive Reader'}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">\${t('landing.navAdaptive') || 'Adaptive AI'}</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">\${t('landing.navTeam') || 'Team PINAKA'}</a>
        </nav>`;

app = app.replace(oldNavSearch, newNavReplace);

// Update mobile nav drawer
const oldMobileDrawer = `<div id="mobile-nav-drawer" class="mobile-nav-drawer \${mobileMenuOpen ? 'open' : ''}">
        <a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">Why DyslexiMate</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">Curated Activities</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">Interactive Reader Playground</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">Adaptive AI Architecture</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">Meet Team PINAKA</a>`;

const newMobileDrawer = `<div id="mobile-nav-drawer" class="mobile-nav-drawer \${mobileMenuOpen ? 'open' : ''}">
        <a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">\${t('landing.navWhy') || 'Why DyslexiMate'}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">\${t('landing.navActivities') || 'Curated Activities'}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">\${t('landing.navReader') || 'Interactive Reader Playground'}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">\${t('landing.navAdaptive') || 'Adaptive AI Architecture'}</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">\${t('landing.navTeam') || 'Meet Team PINAKA'}</a>`;

app = app.replace(oldMobileDrawer, newMobileDrawer);

// Also add language dropdown in landing site-nav-actions
const oldSiteNavActions = `<div class="site-nav-actions">\n          <button type="button" class="theme-toggle-btn"`;

const newSiteNavActions = `<div class="site-nav-actions">
          <!-- Dynamic Website Language Selector -->
          <div class="custom-lang-selector \${customLangMenuOpen ? 'open' : ''}" id="customLangDropdown">
            <button
              type="button"
              class="custom-lang-trigger"
              data-action="toggle-custom-lang"
              aria-haspopup="listbox"
              aria-expanded="\${customLangMenuOpen ? 'true' : 'false'}"
              aria-label="Select interface language"
              title="Interface Language: \${escapeHtml(i18n.getCurrentMeta().nativeName)}"
              style="padding: 6px 12px; font-size: 13px;"
            >
              <span class="custom-lang-globe" aria-hidden="true">🌐</span>
              <span class="custom-lang-name">\${escapeHtml(i18n.getCurrentMeta().nativeName)}</span>
              <span class="custom-lang-arrow" aria-hidden="true">▾</span>
            </button>
            <div class="custom-lang-menu" role="listbox">
              \${SUPPORTED_LANGUAGES.map(lang => {
                const isSelected = i18n.getCurrentLanguage() === lang.code;
                return \`
                  <button
                    type="button"
                    role="option"
                    aria-selected="\${isSelected ? 'true' : 'false'}"
                    class="custom-lang-option \${isSelected ? 'selected' : ''}"
                    data-action="select-landing-language"
                    data-lang-code="\${lang.code}"
                  >
                    <span class="custom-lang-flag">\${lang.flag}</span>
                    <span class="custom-lang-text">
                      <strong>\${escapeHtml(lang.nativeName)}</strong>
                      <small>\${escapeHtml(lang.englishName)}</small>
                    </span>
                    \${isSelected ? '<span class=\"custom-lang-check\">✓</span>' : ''}
                  </button>
                \`;
              }).join('')}
            </div>
          </div>

          <button type="button" class="theme-toggle-btn"`;

if (!app.includes('select-landing-language') || !app.includes('Select interface language')) {
  app = app.replace(oldSiteNavActions, newSiteNavActions);
}

// 3. Update landing hero strings
app = app.replace(
  '<span>✦</span> AI-POWERED MULTISENSORY LEARNING · AGES 5-12',
  `<span>✦</span> \${t('landing.badge') || 'AI-POWERED MULTISENSORY LEARNING · AGES 5-12'}`
);

app = app.replace(
  'Little steps. Big reading wins for <span class="highlight-teal">every curious mind.</span>',
  `\${t('landing.heroTitle') || 'Little steps. Big reading wins for <span class=\"highlight-teal\">every curious mind.</span>'}`
);

app = app.replace(
  'A gentle, science-backed learning companion designed for children navigating dyslexia and reading hurdles. Combining multisensory phonics, adaptive AI pacing, speech synthesis, and parent-governed confidence.',
  `\${t('landing.heroSubtitle') || 'A gentle, science-backed learning companion designed for children navigating dyslexia and reading hurdles. Combining multisensory phonics, adaptive AI pacing, speech synthesis, and parent-governed confidence.'}`
);

app = app.replace(
  '🚀 Launch Interactive Demo <span>→</span>',
  `\${t('landing.btnTryDemo') || 'Launch Interactive Demo'} <span>→</span>`
);

app = app.replace(
  '👨‍👩‍👧 Parent &amp; Guardian Space',
  `\${t('landing.btnParentAccess') || 'Parent & Guardian Space'}`
);

// 4. Update Why DyslexiMate section
app = app.replace(
  '<span class="section-badge">PEDAGOGICAL FOUNDATION</span>\n            <h2 class="section-title">Designed for how neurodivergent minds actually learn.</h2>\n            <p class="section-desc">\n              Traditional drills often induce anxiety. DyslexiMate integrates Orton-Gillingham multisensory principles into low-stress, engaging digital experiences.\n            </p>',
  `<span class="section-badge">\${t('landing.adaptiveBadge') || 'PEDAGOGICAL FOUNDATION'}</span>
            <h2 class="section-title">\${t('landing.adaptiveTitle') || 'Designed for how neurodivergent minds actually learn.'}</h2>
            <p class="section-desc">
              \${t('landing.adaptiveSubtitle') || 'Traditional drills often induce anxiety. DyslexiMate integrates Orton-Gillingham multisensory principles into low-stress, engaging digital experiences.'}
            </p>`
);

app = app.replace(
  '<h3>Multisensory Structured Phonics</h3>\n              <p>Simultaneously connects visual graphemes, auditory phonemes, and verbal pronunciation. Helps anchor memory paths naturally.</p>',
  `<h3>\${t('landing.card1Title') || 'Multisensory Structured Phonics'}</h3>
              <p>\${t('landing.card1Desc') || 'Simultaneously connects visual graphemes, auditory phonemes, and verbal pronunciation. Helps anchor memory paths naturally.'}</p>`
);

app = app.replace(
  '<h3>Zero-Frustration Adaptive Pacing</h3>\n              <p>The system recalibrates in real time. If a child hesitates, it offers supportive step-by-step hints instead of red crosses or negative penalization.</p>',
  `<h3>\${t('landing.card2Title') || 'Zero-Frustration Adaptive Pacing'}</h3>
              <p>\${t('landing.card2Desc') || 'The system recalibrates in real time. If a child hesitates, it offers supportive step-by-step hints instead of red crosses or negative penalization.'}</p>`
);

app = app.replace(
  '<h3>Voice-First &amp; Native Mother Tongue</h3>\n              <p>Built with native speech synthesis across English, Hindi, Bengali, Punjabi, Tamil, and Odia. Children listen, repeat, and build genuine fluency.</p>',
  `<h3>\${t('landing.card3Title') || 'Voice-First & Native Mother Tongue'}</h3>
              <p>\${t('landing.card3Desc') || 'Built with native speech synthesis across English, Hindi, Bengali, Punjabi, Tamil, and Odia. Children listen, repeat, and build genuine fluency.'}</p>`
);

app = app.replace(
  '<h3>Parent-Governed Transparency</h3>\n              <p>100% child-safe and privacy-first. Parents monitor true learning metrics calculated from real recorded attempts — never fabricated gamification.</p>',
  `<h3>\${t('landing.card4Title') || 'Parent-Governed Transparency'}</h3>
              <p>\${t('landing.card4Desc') || '100% child-safe and privacy-first. Parents monitor true learning metrics calculated from real recorded attempts — never fabricated gamification.'}</p>`
);

// 5. Update Interactive Reader playground section
app = app.replace(
  '<span class="section-badge">TEST IT YOURSELF</span>\n            <h2 class="section-title">Experience assistive reading tools in real-time.</h2>\n            <p class="section-desc">\n              Test how typography, syllable chunking, line rulers, and text-to-speech alleviate ocular strain and boost comprehension.\n            </p>',
  `<span class="section-badge">\${t('landing.interactiveBadge') || 'TEST IT YOURSELF'}</span>
            <h2 class="section-title">\${t('landing.interactiveTitle') || 'Experience assistive reading tools in real-time.'}</h2>
            <p class="section-desc">
              \${t('landing.interactiveSubtitle') || 'Test how typography, syllable chunking, line rulers, and text-to-speech alleviate ocular strain and boost comprehension.'}
            </p>`
);

// 6. Update Team PINAKA section
app = app.replace(
  '<span class="section-badge">MEET TEAM PINAKA</span>\n            <h2 class="section-title">Built with empathy by Team PINAKA.</h2>\n            <p class="section-desc">\n              We are a passionate team dedicated to leveraging technology for educational accessibility, equity, and neurodivergent empowerment.\n            </p>',
  `<span class="section-badge">\${t('landing.teamBadge') || 'MEET TEAM PINAKA'}</span>
            <h2 class="section-title">\${t('landing.teamTitle') || 'Built with empathy by Team PINAKA.'}</h2>
            <p class="section-desc">
              \${t('landing.teamSubtitle') || 'We are a passionate team dedicated to leveraging technology for educational accessibility, equity, and neurodivergent empowerment.'}
            </p>`
);

// 7. Update FAQ section
app = app.replace(
  '<span class="section-badge">COMMONLY ASKED QUESTIONS</span>\n            <h2 class="section-title">Everything you need to know about DyslexiMate.</h2>\n            <p class="section-desc">\n              Clear answers to common questions from parents, guardians, and educators.\n            </p>',
  `<span class="section-badge">\${t('landing.faqBadge') || 'COMMONLY ASKED QUESTIONS'}</span>
            <h2 class="section-title">\${t('landing.faqTitle') || 'Everything you need to know about DyslexiMate.'}</h2>
            <p class="section-desc">
              \${t('landing.faqSubtitle') || 'Clear answers to common questions from parents, guardians, and educators.'}
            </p>`
);

// 8. Update progressPage strings
app = app.replace(
  "<span>HALL OF ACHIEVEMENTS · ${escapeHtml(child.name)}'s Trophy Room</span>",
  `<span>\${t('progress.hallOfAchievements', { name: escapeHtml(child.name) }) || ('HALL OF ACHIEVEMENTS · ' + escapeHtml(child.name) + \"'s Trophy Room\")}</span>`
);

app = app.replace(
  `<h2 class="realm-title">\n              Superpowers & Milestone Trophies!\n            </h2>`,
  `<h2 class="realm-title">\n              \${t('progress.trophyRoomTitle') || 'Superpowers & Milestone Trophies!'}\n            </h2>`
);

app = app.replace(
  `<p class="realm-desc">\n              🦉 Hootie cheers: "Look how far you've come! Every quest you play makes your reading superpowers shine brighter!"\n            </p>`,
  `<p class="realm-desc">\n              \${t('progress.hootieCheer') || '🦉 Hootie cheers: \"Look how far you\\'ve come! Every quest you play makes your reading superpowers shine brighter!\"'}\n            </p>`
);

app = app.replace(
  `<span>\${mapState.totalStars} Stars Earned</span>`,
  `<span>\${t('progress.starsEarned', { count: String(mapState.totalStars) }) || \`\${mapState.totalStars} Stars Earned\`}</span>`
);

app = app.replace(
  `<span>\${progress.happyPoints || 0} Happy Points</span>`,
  `<span>\${t('progress.happyPoints', { count: String(progress.happyPoints || 0) }) || \`\${progress.happyPoints || 0} Happy Points\`}</span>`
);

app = app.replace(
  `<span>\${totalLevelsMastered} / 15 Levels Won</span>`,
  `<span>\${t('progress.levelsWon', { count: String(totalLevelsMastered) }) || \`\${totalLevelsMastered} / 15 Levels Won\`}</span>`
);

app = app.replace(
  `<span class="pedestal-label">Practice Time</span>\n            <strong class="pedestal-val">\${progress.practiceMinutes} <small>min</small></strong>\n            <small class="pedestal-sub sub-blue">+18% from last week</small>`,
  `<span class="pedestal-label">\${t('progress.practiceTimeCard') || 'Practice Time'}</span>
            <strong class="pedestal-val">\${progress.practiceMinutes} <small>\${t('progress.minutesUnit') || 'min'}</small></strong>
            <small class="pedestal-sub sub-blue">\${t('progress.weekComparison') || '+18% from last week'}</small>`
);

app = app.replace(
  `<span class="pedestal-label">Words Mastered</span>\n            <strong class="pedestal-val">\${wordsLearned} <small>words</small></strong>\n            <small class="pedestal-sub sub-green">12 new this week</small>`,
  `<span class="pedestal-label">\${t('progress.wordsMasteredCard') || 'Words Mastered'}</span>
            <strong class="pedestal-val">\${wordsLearned} <small>\${t('progress.wordsUnit') || 'words'}</small></strong>
            <small class="pedestal-sub sub-green">\${t('progress.newThisWeek') || '12 new this week'}</small>`
);

app = app.replace(
  `<span class="pedestal-label">Reading Speed</span>\n            <strong class="pedestal-val">\${progress.readingSpeedWpm || 68} <small>WPM</small></strong>\n            <small class="pedestal-sub sub-purple">Gentle &amp; growing pace</small>`,
  `<span class="pedestal-label">\${t('progress.readingSpeedCard') || 'Reading Speed'}</span>
            <strong class="pedestal-val">\${progress.readingSpeedWpm || 68} <small>\${t('progress.wpmUnit') || 'WPM'}</small></strong>
            <small class="pedestal-sub sub-purple">\${t('progress.speedProgress') || 'Gentle & growing pace'}</small>`
);

app = app.replace(
  `<h3 class="open-section-title">Superpower Trophies</h3>\n            <p class="open-section-desc">\n              Earn medals as you practice letters, sounds, words, and stories across adventure destinations.\n            </p>`,
  `<h3 class="open-section-title">\${t('progress.superpowerTrophies') || 'Superpower Trophies'}</h3>
            <p class="open-section-desc">
              \${t('progress.superpowerTrophiesDesc') || 'Earn medals as you practice letters, sounds, words, and stories across adventure destinations.'}
            </p>`
);

app = app.replace(
  `<h3 class="open-section-title">Recent Quest Sessions</h3>\n            <p class="open-section-desc">\n              Your latest practice challenges and achievements.\n            </p>`,
  `<h3 class="open-section-title">\${t('progress.recentActivity') || 'Recent Quest Sessions'}</h3>
            <p class="open-section-desc">
              \${t('progress.recentActivityDesc') || 'Your latest practice challenges and achievements.'}
            </p>`
);

// 9. Update achievements titles & descriptions in progressPage
app = app.replace(
  "title: 'Word Explorer',\n      icon: '🧭',\n      category: 'Vocabulary Power',\n      description: 'Collect decodable words and master new sounds across realms.',",
  "title: t('progress.wordExplorerTitle') || 'Word Explorer',\n      icon: '🧭',\n      category: 'Vocabulary Power',\n      description: t('progress.wordExplorerDesc') || 'Collect decodable words and master new sounds across realms.',"
);

app = app.replace(
  "title: 'Reading Champion',\n      icon: '🏆',\n      category: 'Practice Momentum',\n      description: 'Build daily reading habits with active challenge quests.',",
  "title: t('progress.readingChampionTitle') || 'Reading Champion',\n      icon: '🏆',\n      category: 'Practice Momentum',\n      description: t('progress.readingChampionDesc') || 'Build daily reading habits with active challenge quests.',"
);

app = app.replace(
  "title: 'Spelling Star',\n      icon: '⭐',\n      category: 'Phonetic Accuracy',\n      description: 'Reach awesome reading accuracy on challenges and words.',",
  "title: t('progress.spellingStarTitle') || 'Spelling Star',\n      icon: '⭐',\n      category: 'Phonetic Accuracy',\n      description: t('progress.spellingStarDesc') || 'Reach awesome reading accuracy on challenges and words.',"
);

app = app.replace(
  "title: 'Sound Detective',\n      icon: '🔍',\n      category: 'Acoustic Mastery',\n      description: 'Solve tricky sound clues in Alphabet Forest & Sound Safari.',",
  "title: t('progress.soundDetectiveTitle') || 'Sound Detective',\n      icon: '🔍',\n      category: 'Acoustic Mastery',\n      description: t('progress.soundDetectiveDesc') || 'Solve tricky sound clues in Alphabet Forest & Sound Safari.',"
);

app = app.replace(
  "title: 'Word Wizard',\n      icon: '🧙‍♂️',\n      category: 'Digraph & Blend Sorcery',\n      description: 'Defeat tricky letter traps in Word Wonderland & Spelling Castle.',",
  "title: t('progress.wordWizardTitle') || 'Word Wizard',\n      icon: '🧙‍♂️',\n      category: 'Digraph & Blend Sorcery',\n      description: t('progress.wordWizardDesc') || 'Defeat tricky letter traps in Word Wonderland & Spelling Castle.',"
);

app = app.replace(
  "title: 'Story Royalty',\n      icon: '👑',\n      category: 'Royal Comprehension',\n      description: 'Conquer Rhyme River and claim the Storybook Kingdom crown.',",
  "title: t('progress.storyRoyaltyTitle') || 'Story Royalty',\n      icon: '👑',\n      category: 'Royal Comprehension',\n      description: t('progress.storyRoyaltyDesc') || 'Conquer Rhyme River and claim the Storybook Kingdom crown.',"
);

// 10. Update renderProfiles View Website & Parent Dashboard buttons
app = app.replace(
  '<a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">\n            🌐 View Website\n          </a>',
  `<a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🌐 \${t('nav.backToWebsite') || 'View Website'}
          </a>`
);

app = app.replace(
  '<a href="#/parent" class="btn btn-outline btn-sm" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">\n            🛡️ Parent Dashboard\n          </a>',
  `<a href="#/parent" class="btn btn-outline btn-sm" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🛡️ \${t('profileSelect.parentDash') || 'Parent Dashboard'}
          </a>`
);

app = app.replace(
  '<button type="button" class="btn btn-ghost btn-sm" data-action="logout">\n            Sign out\n          </button>',
  `<button type="button" class="btn btn-ghost btn-sm" data-action="logout">
            \${t('common.logOut') || 'Sign out'}
          </button>`
);

// Restore CRLF if file was CRLF originally
if (isCrlf) {
  app = app.replace(/\n/g, '\r\n');
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('✓ All application translations applied to Front_end/app.ts successfully!');
