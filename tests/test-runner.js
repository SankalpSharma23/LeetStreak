#!/usr/bin/env node

/**
 * Master Test Runner
 * Executes all test suites in sequence: Unit → Integration → E2E
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

async function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    log(`\n▶️  ${description}`, 'cyan');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} - PASSED\n`, 'green');
        resolve({ success: true, description });
      } else {
        log(`❌ ${description} - FAILED (Exit code: ${code})\n`, 'red');
        resolve({ success: false, description, exitCode: code });
      }
    });

    child.on('error', (error) => {
      log(`❌ ${description} - ERROR: ${error.message}\n`, 'red');
      reject({ success: false, description, error: error.message });
    });
  });
}

async function checkPrerequisites() {
  logSection('🔍 Checking Prerequisites');

  // Check if dist folder exists (extension built)
  const distPath = path.resolve(__dirname, '../dist');
  if (!fs.existsSync(distPath)) {
    log('⚠️  Extension not built! Building now...', 'yellow');
    await runCommand('npm', ['run', 'build'], 'Building Extension');
  } else {
    log('✅ Extension build found', 'green');
  }

  // Check if node_modules exists
  const nodeModulesPath = path.resolve(__dirname, '../node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('⚠️  Dependencies not installed! Installing now...', 'yellow');
    await runCommand('npm', ['install'], 'Installing Dependencies');
  } else {
    log('✅ Dependencies installed', 'green');
  }
}

async function runAllTests() {
  logSection('🚀 LeetStreak Extension - Comprehensive Test Suite');
  
  const startTime = Date.now();
  const results = [];

  try {
    // Prerequisites
    await checkPrerequisites();

    // Phase 1: Unit Tests
    logSection('📝 Phase 1: Unit Tests (Logic Engine)');
    const unitResult = await runCommand(
      'npm',
      ['run', 'test:unit'],
      'Unit Tests - Streak Calculation & Improvement Rule'
    );
    results.push(unitResult);

    // Phase 2: Integration Tests
    logSection('💾 Phase 2: Integration Tests (Data Persistence)');
    const integrationResult = await runCommand(
      'npm',
      ['run', 'test:integration'],
      'Integration Tests - Chrome Storage Persistence'
    );
    results.push(integrationResult);

    // Phase 3: E2E Tests
    logSection('🌐 Phase 3: End-to-End Tests (Real Browser)');
    const e2eResult = await runCommand(
      'npm',
      ['run', 'test:e2e'],
      'E2E Tests - Puppeteer Browser Automation'
    );
    results.push(e2eResult);

  } catch (error) {
    log(`\n❌ Test suite encountered an error: ${error.message}`, 'red');
    results.push({ success: false, error: error.message });
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logSection('📊 Final Test Summary');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log(`Total Test Phases: ${results.length}`, 'bright');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`⏱️  Total Duration: ${duration}s`, 'cyan');

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED! Extension is ready for production.\n', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  SOME TESTS FAILED. Please review the logs above.\n', 'red');
    process.exit(1);
  }
}

// Run the test suite
runAllTests().catch(error => {
  log(`\n💥 Fatal Error: ${error.message}\n`, 'red');
  process.exit(1);
});
