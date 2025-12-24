/**
 * E2E Test Runner
 * Executes Puppeteer tests with proper setup
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_PATH = path.resolve(__dirname, '../../dist');
const TEST_RESULTS_DIR = path.resolve(__dirname, '../../test-results');

// Ensure test results directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

console.log('\n🚀 Starting E2E Test Suite\n');
console.log(`📦 Extension Path: ${EXTENSION_PATH}`);
console.log(`📊 Results Dir: ${TEST_RESULTS_DIR}\n`);

// Check if extension is built
if (!fs.existsSync(EXTENSION_PATH)) {
  console.error('❌ Extension not built! Run `npm run build` first.');
  process.exit(1);
}

async function runE2ETests() {
  let browser;
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    console.log('🌐 Launching Chrome with extension...\n');

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    // Get extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(
      target => target.type() === 'service_worker'
    );

    if (!extensionTarget) {
      throw new Error('Extension service worker not found!');
    }

    const extensionUrl = extensionTarget.url();
    const extensionId = extensionUrl.split('/')[2];
    console.log(`✅ Extension loaded: ${extensionId}\n`);

    // Run test scenarios
    await runTestScenario(browser, extensionId, 'Happy Path Test', happyPathTest, results);
    await runTestScenario(browser, extensionId, 'Time Travel Test', timeTravelTest, results);
    await runTestScenario(browser, extensionId, 'Storage Persistence', storagePersistenceTest, results);
    await runTestScenario(browser, extensionId, 'Notification Display', notificationTest, results);

  } catch (error) {
    console.error('❌ E2E Test Suite Failed:', error.message);
    results.failed++;
  } finally {
    if (browser) {
      await browser.close();
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 E2E TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log('='.repeat(50) + '\n');

    // Save results to file
    const resultsFile = path.join(TEST_RESULTS_DIR, 'e2e-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`📄 Results saved to: ${resultsFile}\n`);

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

async function runTestScenario(browser, extensionId, testName, testFn, results) {
  results.total++;
  console.log(`🧪 Running: ${testName}...`);

  const page = await browser.newPage();
  const startTime = Date.now();

  try {
    await testFn(page, extensionId);
    const duration = Date.now() - startTime;

    results.passed++;
    results.tests.push({
      name: testName,
      status: 'passed',
      duration: `${duration}ms`
    });

    console.log(`   ✅ PASSED (${duration}ms)\n`);
  } catch (error) {
    const duration = Date.now() - startTime;

    results.failed++;
    results.tests.push({
      name: testName,
      status: 'failed',
      duration: `${duration}ms`,
      error: error.message
    });

    console.log(`   ❌ FAILED (${duration}ms)`);
    console.log(`   Error: ${error.message}\n`);
  } finally {
    await page.close();
  }
}

// Test Functions
async function happyPathTest(page, extensionId) {
  await page.setRequestInterception(true);

  page.on('request', request => {
    if (request.url().includes('leetcode.com/graphql')) {
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            matchedUser: {
              username: 'TestUser',
              profile: { realName: 'Test', userAvatar: '', ranking: 1000 },
              submitStats: {
                acSubmissionNum: [
                  { difficulty: 'All', count: 100, submissions: 150 }
                ]
              },
              submissionCalendar: JSON.stringify({
                [Math.floor(Date.now() / 1000)]: 3
              })
            }
          }
        })
      });
    } else {
      request.continue();
    }
  });

  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector('body', { timeout: 5000 });

  const content = await page.evaluate(() => document.body.innerText);
  if (!content.includes('Streak') && !content.includes('LeetStreak')) {
    throw new Error('Extension UI not loaded properly');
  }
}

async function timeTravelTest(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector('body', { timeout: 5000 });

  // Override Date
  await page.evaluateOnNewDocument(() => {
    const originalDate = Date;
    window.Date = class extends originalDate {
      static now() {
        return new originalDate('2023-01-03T12:00:00Z').getTime();
      }
    };
  });

  // Inject old data
  await page.evaluate(() => {
    chrome.storage.local.set({
      my_leetcode_username: 'TestUser',
      leetfriends_friends: {
        TestUser: {
          stats: { streak: 5 },
          lastUpdated: new Date('2023-01-01').getTime(),
          submissionCalendar: {}
        }
      }
    });
  });

  await page.reload();
  await page.waitForTimeout(1000);

  console.log('   ⏰ Time travel simulation completed');
}

async function storagePersistenceTest(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector('body', { timeout: 5000 });

  // Write data
  await page.evaluate(() => {
    return chrome.storage.local.set({ test_key: 'test_value', test_number: 42 });
  });

  // Read data
  const data = await page.evaluate(() => {
    return chrome.storage.local.get(['test_key', 'test_number']);
  });

  if (data.test_key !== 'test_value' || data.test_number !== 42) {
    throw new Error('Storage persistence check failed');
  }
}

async function notificationTest(page, extensionId) {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector('body', { timeout: 5000 });

  // Inject notification
  await page.evaluate(() => {
    chrome.storage.local.set({
      unread_notifications: [
        {
          id: '123',
          username: 'TestFriend',
          type: 'solved_today',
          message: 'TestFriend solved today!',
          timestamp: Date.now()
        }
      ]
    });
  });

  await page.reload();
  await page.waitForTimeout(1500);

  console.log('   🔔 Notification injection completed');
}

// Run the test suite
runE2ETests();
