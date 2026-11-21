import { chromium } from 'playwright';

async function testPhase3() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to DyslexiMate...');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  // Click Launch Instant Demo
  console.log('Launching instant demo...');
  const demoBtn = page.getByRole('button', { name: /instant demo/i });
  await demoBtn.click();
  await page.waitForTimeout(1500);

  // Confirm we are at #/home
  console.log('Current URL after launch:', page.url());

  // Navigate to Practice tab
  console.log('Navigating to Practice tab...');
  const practiceLink = page.locator('a[href="#/practice"]').first();
  if (await practiceLink.isVisible()) {
    await practiceLink.click();
  } else {
    await page.goto('http://localhost:5173/#/practice');
  }
  await page.waitForTimeout(1200);
  console.log('Current URL on practice tab:', page.url());

  // Look for the Letter Mirror / b/d detective activity card
  console.log('Looking for Letter Mirror activity card...');
  const letterMirrorBtn = page.locator('button[data-skill="skill_confused_letters_bd"]').first();
  
  if (await letterMirrorBtn.count() === 0) {
    // If not found by selector, list practice buttons
    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => ({
        id: b.id,
        text: b.innerText.trim().slice(0, 40),
        dataId: b.getAttribute('data-activity-id')
      }));
    });
    console.log('Available buttons on practice page:', JSON.stringify(allButtons.slice(0, 15)));
    throw new Error('Letter Mirror activity button not found');
  }

  await letterMirrorBtn.scrollIntoViewIfNeeded();
  await letterMirrorBtn.click();
  await page.waitForTimeout(1000);

  // Verify modal container exists and is visible
  const modalContainer = page.locator('#bdRunnerModalContainer');
  const isModalVisible = await modalContainer.isVisible();
  console.log('Is BD modal visible:', isModalVisible);
  if (!isModalVisible) {
    throw new Error('BD Modal container is not visible after clicking activity button');
  }

  // Check styling of modal card
  const modalCard = page.locator('#bdRunnerModalContainer .modal-card');
  const cardBox = await modalCard.boundingBox();
  console.log('Modal card bounding box:', cardBox);

  const cardStyles = await modalCard.evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      zIndex: cs.zIndex,
      backgroundColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      display: cs.display
    };
  });
  console.log('Modal card computed styles:', cardStyles);

  // Check options styling (font size, contrast)
  const optionButtons = page.locator('#bdRunnerModalContainer .bd-option-btn');
  const optCount = await optionButtons.count();
  console.log('Number of BD option buttons:', optCount);
  if (optCount < 2) {
    throw new Error(`Expected at least 2 option buttons, found ${optCount}`);
  }

  const firstOptStyles = await optionButtons.first().evaluate(el => {
    const cs = window.getComputedStyle(el);
    return {
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      minHeight: cs.minHeight
    };
  });
  console.log('First option button styles:', firstOptStyles);

  // Test playing through 5 rounds
  for (let round = 1; round <= 5; round++) {
    console.log(`Playing round ${round}/5...`);
    // Click the first option button
    await optionButtons.first().click();
    await page.waitForTimeout(600);

    // Verify feedback box
    const feedbackBox = page.locator('#bdFeedbackBox');
    const fbText = await feedbackBox.innerText();
    console.log(`Round ${round} feedback:`, fbText.replace(/\n/g, ' '));

    // Next round button
    const nextBtn = page.locator('#btnNextBDRound');
    await nextBtn.waitFor({ state: 'visible', timeout: 3000 });
    await nextBtn.click();
    await page.waitForTimeout(600);
  }

  // Verify completion / summary modal
  console.log('Verifying completion summary modal...');
  const finishBtn = page.locator('#btnFinishBDModal');
  await finishBtn.waitFor({ state: 'visible', timeout: 5000 });

  const summaryText = await page.locator('#bdRunnerModalContainer .modal-card').innerText();
  console.log('Summary card text snippet:', summaryText.replace(/\n+/g, ' | ').slice(0, 200));

  // Click finish button to return to practice
  await finishBtn.click();
  await page.waitForTimeout(1000);

  // Verify modal is closed/removed
  const isStillOpen = await page.locator('#bdRunnerModalContainer').isVisible();
  console.log('Is modal still open after finish:', isStillOpen);
  if (isStillOpen) {
    throw new Error('Modal did not close after clicking finish button');
  }

  console.log('✅ Phase 3 verification completed successfully!');
  await browser.close();
}

testPhase3().catch(err => {
  console.error('❌ Phase 3 verification failed:', err);
  process.exit(1);
});
