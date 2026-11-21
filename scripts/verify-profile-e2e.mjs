import { chromium } from 'playwright';

async function run() {
  console.log('🚀 Launching Playwright browser verification for Child Profile Editing Flow...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  try {
    // Step 1: Open landing page and launch demo
    await page.goto('http://localhost:5173/#/landing', { waitUntil: 'networkidle' });
    console.log('✓ Loaded landing page');

    const demoBtn = page.locator('button[data-action="launch-demo"]').first();
    await demoBtn.click();
    await page.waitForTimeout(1000);

    // Verify on child dashboard
    console.log('Current URL:', page.url());
    if (!page.url().includes('#/home')) {
      throw new Error(`Expected URL to include #/home, got ${page.url()}`);
    }

    // Step 2: Verify Aanya's dashboard is displayed
    const heading = await page.locator('.welcome-copy h2').first().innerText();
    console.log('Dashboard greeting:', heading);
    if (!heading.includes('Aanya')) {
      throw new Error(`Expected greeting to contain Aanya, got: ${heading}`);
    }

    // Step 3: Open Edit Child Profile from the child dashboard (using welcome banner button)
    const editBtn = page.locator('.welcome-banner button[data-action="edit-child"]').first();
    await editBtn.click();
    await page.waitForSelector('#profile-modal-title', { state: 'visible', timeout: 5000 });
    console.log('✓ Edit Profile modal opened from child dashboard');

    // Step 4: Edit information in modal
    const nameInput = page.locator('input[name="name"]').first();
    await nameInput.fill('Aanya Sharma ⭐');

    const modalDebug = await page.evaluate(() => {
      const form = document.querySelector('#child-form');
      const root = document.querySelector('#app');
      const isInsideRoot = root ? root.contains(form) : false;
      return { isInsideRoot, formId: form?.id, formParent: form?.parentElement?.className };
    });
    console.log('Is form inside #app?', modalDebug);

    // Step 5: Click Save Changes
    await page.locator('.modal-card').evaluate(el => el.scrollTop = el.scrollHeight);
    const saveBtn = page.locator('#btn-save-child-profile').first();
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // Step 6: Verify user REMAINS on Aanya's dashboard (did NOT redirect to #/profiles)
    console.log('URL after save:', page.url());
    if (page.url().includes('#/profiles')) {
      throw new Error('FAILED: Unexpected redirect to #/profiles after saving from dashboard!');
    }
    if (!page.url().includes('#/home')) {
      throw new Error(`FAILED: Expected to remain on #/home, got ${page.url()}`);
    }
    console.log('✓ Successfully remained on child dashboard (#/home) after saving');

    // Step 7: Verify updated information appears immediately without refresh
    const updatedHeading = await page.locator('.welcome-copy h2').first().innerText();
    console.log('Updated greeting:', updatedHeading);
    if (!updatedHeading.includes('Aanya Sharma ⭐')) {
      throw new Error(`Expected updated greeting to contain "Aanya Sharma ⭐", got: ${updatedHeading}`);
    }
    console.log('✓ Updated name appears immediately on child dashboard');

    // Step 8: Verify editing from profile selection screen returns to profile selection screen
    console.log('\nTesting context preservation from Profile Selection screen (#/profiles)...');
    await page.goto('http://localhost:5173/#/profiles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const profileHeading = await page.locator('.profile-intro h1').first().innerText();
    console.log('Profiles page heading:', profileHeading);

    // Click edit on Kabir Sharma
    const editKabirBtn = page.locator('article.profile-card').nth(1).locator('button[data-action="edit-child"]');
    await editKabirBtn.click();
    await page.waitForSelector('#profile-modal-title', { state: 'visible', timeout: 5000 });
    console.log('✓ Edit modal opened from #/profiles');

    const kabirNameInput = page.locator('input[name="name"]').first();
    await kabirNameInput.fill('Kabir Sharma 🚀');

    const kabirSaveBtn = page.locator('#btn-save-child-profile').first();
    await kabirSaveBtn.click();
    await page.waitForTimeout(1200);

    console.log('URL after saving Kabir from profiles:', page.url());
    if (!page.url().includes('#/profiles')) {
      throw new Error(`FAILED: Expected to return to #/profiles, got ${page.url()}`);
    }
    console.log('✓ Successfully remained on #/profiles after saving from profile selection screen');

    const kabirCardText = await page.locator('article.profile-card').nth(1).innerText();
    console.log('Kabir card text:', kabirCardText);
    if (!kabirCardText.includes('Kabir Sharma 🚀')) {
      throw new Error(`Expected Kabir card to contain "Kabir Sharma 🚀", got: ${kabirCardText}`);
    }
    console.log('✓ Kabir updated name appears immediately on profile card');

    console.log('\n🎉 ALL E2E BROWSER CHECKS PASSED WITH 100% ACCURACY!');
  } catch (error) {
    console.error('❌ E2E Browser Test Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
