import { execSync } from 'child_process';
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const REPORTS_DIR = path.resolve('audit-reports');

async function runLighthouseAudit() {
  console.log('⚡ Running Lighthouse Performance & SEO Audits...');
  const chromePath = chromium.executablePath();
  process.env.CHROME_PATH = chromePath;
  console.log('Using Chromium binary at:', chromePath);

  // 1. Local Dev App
  try {
    console.log('Auditing Local Dev URL: http://localhost:5173/#/landing ...');
    const localCmd = `npx lighthouse http://localhost:5173/ --output=json --output-path="${path.join(REPORTS_DIR, 'lighthouse-local.json')}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`;
    execSync(localCmd, { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath } });
    console.log('✅ Local Lighthouse audit complete.');
  } catch (err) {
    console.warn('Local Lighthouse audit warning:', err.message);
  }

  // 2. Deployed Production Site
  try {
    console.log('Auditing Deployed URL: https://sharanga.vercel.app/ ...');
    const deployedCmd = `npx lighthouse https://sharanga.vercel.app/ --output=json --output-path="${path.join(REPORTS_DIR, 'lighthouse-deployed.json')}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`;
    execSync(deployedCmd, { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath } });
    console.log('✅ Deployed Lighthouse audit complete.');
  } catch (err) {
    console.warn('Deployed Lighthouse audit warning:', err.message);
  }

  console.log('⚡ All Lighthouse audits finished.');
}

runLighthouseAudit();
