import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import fs from 'fs';
import path from 'path';

const REPORTS_DIR = path.resolve('audit-reports');

async function run() {
  console.log('🚀 Launching Chromium on port 9222 for Lighthouse...');
  const browser = await chromium.launch({
    args: ['--remote-debugging-port=9222', '--headless=new', '--no-sandbox']
  });

  const urls = [
    { name: 'local', url: 'http://localhost:5173/' },
    { name: 'deployed', url: 'https://sharanga.vercel.app/' }
  ];

  for (const item of urls) {
    try {
      console.log(`Running Lighthouse on ${item.url}...`);
      const runnerResult = await lighthouse(item.url, {
        port: 9222,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
      });

      const reportJson = runnerResult.report;
      const parsed = JSON.parse(reportJson);
      fs.writeFileSync(path.join(REPORTS_DIR, `lighthouse-${item.name}.json`), reportJson);
      
      const summary = {
        url: item.url,
        fetchTime: parsed.fetchTime,
        scores: {
          performance: Math.round(parsed.categories.performance.score * 100),
          accessibility: Math.round(parsed.categories.accessibility.score * 100),
          bestPractices: Math.round(parsed.categories['best-practices'].score * 100),
          seo: Math.round(parsed.categories.seo.score * 100),
        },
        metrics: {
          firstContentfulPaint: parsed.audits['first-contentful-paint']?.displayValue,
          largestContentfulPaint: parsed.audits['largest-contentful-paint']?.displayValue,
          totalBlockingTime: parsed.audits['total-blocking-time']?.displayValue,
          cumulativeLayoutShift: parsed.audits['cumulative-layout-shift']?.displayValue,
          speedIndex: parsed.audits['speed-index']?.displayValue,
        }
      };

      fs.writeFileSync(path.join(REPORTS_DIR, `lighthouse-${item.name}-summary.json`), JSON.stringify(summary, null, 2));
      console.log(`✅ Completed Lighthouse for ${item.name}:`, summary.scores);
    } catch (err) {
      console.error(`Error running Lighthouse for ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('Lighthouse analysis complete.');
}

run();
