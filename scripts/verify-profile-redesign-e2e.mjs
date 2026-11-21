import { chromium } from 'playwright';

async function run() {
  console.log('🚀 Running Comprehensive E2E Verification for Modern Child Profile & Accessibility Redesign...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  try {
    // 1. Open landing page and launch demo
    await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button[data-action="launch-demo"]').first();
    await demoBtn.click();
    await page.waitForTimeout(1000);

    // 2. Open Edit Profile from child dashboard
    const editBtn = page.locator('.welcome-banner button[data-action="edit-child"]').first();
    await editBtn.click();
    await page.waitForSelector('.profile-modal-modern', { state: 'visible', timeout: 5000 });
    console.log('✓ Modern Profile Modal opened');

    // 3. Verify Modal Elements
    const badgeText = await page.locator('.profile-modal-badge').innerText();
    console.log('Modal badge:', badgeText);

    const titleText = await page.locator('.profile-modal-title').innerText();
    console.log('Modal title:', titleText);

    // Verify preview chip
    const previewChip = page.locator('#modal-child-chip-preview');
    const chipExists = await previewChip.isVisible();
    console.log('Child preview chip visible:', chipExists);
    if (!chipExists) throw new Error('Preview chip not visible in modal');

    // 4. Test Avatar Picker Grid
    const avatarBtns = page.locator('.avatar-opt-btn');
    const count = await avatarBtns.count();
    console.log(`Found ${count} avatar buttons`);
    if (count < 16) throw new Error(`Expected at least 16 avatars, got ${count}`);

    // Click unicorn avatar 🦄
    const unicornBtn = page.locator('.avatar-opt-btn[data-avatar="🦄"]');
    await unicornBtn.click();
    const isUnicornSelected = await unicornBtn.evaluate(el => el.classList.contains('selected'));
    console.log('Unicorn avatar selected:', isUnicornSelected);
    if (!isUnicornSelected) throw new Error('Avatar button did not receive selected class');

    const previewAvatar = await page.locator('#modal-child-preview-avatar').innerText();
    console.log('Preview chip updated avatar:', previewAvatar);
    if (previewAvatar !== '🦄') throw new Error(`Expected preview chip to show 🦄, got: ${previewAvatar}`);

    const hiddenAvatarVal = await page.locator('#modal-child-avatar-input').inputValue();
    if (hiddenAvatarVal !== '🦄') throw new Error(`Expected hidden input value 🦄, got: ${hiddenAvatarVal}`);

    // 5. Test Accessibility Preferences Panel & Toggle Cards
    const accessPanel = page.locator('.accessibility-panel-modern');
    if (!await accessPanel.isVisible()) throw new Error('Accessibility panel not visible');

    const prefCards = page.locator('.pref-toggle-card');
    const prefCardsCount = await prefCards.count();
    console.log(`Found ${prefCardsCount} accessibility preference toggle cards`);
    if (prefCardsCount !== 4) throw new Error(`Expected 4 preference cards, got ${prefCardsCount}`);

    // Toggle dyslexia font switch by clicking the toggle slider
    const dyslexiaCard = prefCards.first();
    await dyslexiaCard.scrollIntoViewIfNeeded();
    const initialActive = await dyslexiaCard.evaluate(el => el.classList.contains('active'));
    console.log('Dyslexia card initial active state:', initialActive);

    const slider = dyslexiaCard.locator('.toggle-slider');
    await slider.click();
    const afterActive = await dyslexiaCard.evaluate(el => el.classList.contains('active'));
    console.log('Dyslexia card active state after click:', afterActive);
    if (afterActive === initialActive) throw new Error('Toggle card active class did not flip on checkbox click');

    // Test Reading Pace select
    const paceSelect = page.locator('select[name="readingSpeed"]');
    await paceSelect.scrollIntoViewIfNeeded();
    await paceSelect.selectOption('slow');
    const selectedPace = await paceSelect.inputValue();
    console.log('Selected reading pace:', selectedPace);
    if (selectedPace !== 'slow') throw new Error('Reading speed select failed');

    // 6. Test Dark Mode rendering of the modal
    console.log('\nTesting modal under Dark Mode...');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
    });
    await page.waitForTimeout(300);

    const modalBg = await page.locator('.profile-modal-modern').evaluate(el => window.getComputedStyle(el).backgroundColor);
    console.log('Dark mode modal background color:', modalBg);

    // Switch back to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark-theme');
    });

    // 7. Save and verify child dashboard updates
    const saveBtn = page.locator('#btn-save-child-profile');
    await saveBtn.click();
    await page.waitForTimeout(1500);

    const newHeading = await page.locator('.welcome-copy h2').first().innerText();
    console.log('Child dashboard heading after save:', newHeading);

    // Verify avatar in sidebar learner switch
    const sidebarAvatar = await page.locator('.learner-switch .profile-avatar').first().innerText();
    console.log('Sidebar avatar after save:', sidebarAvatar);
    if (sidebarAvatar !== '🦄') throw new Error(`Expected sidebar avatar 🦄, got: ${sidebarAvatar}`);

    console.log('\n🎉 ALL CHILD PROFILE & ACCESSIBILITY REDESIGN TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
