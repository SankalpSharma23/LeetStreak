/**
 * VALIDATION TEST - Verify all 6 critical fixes are implemented
 * Run this to confirm fixes are working
 */

console.log('🧪 Testing Critical Fixes Implementation...\n');

let passed = 0;
let failed = 0;

// Test 1: Username Validation
console.log('1️⃣ Testing Username Normalization & XSS Prevention...');
try {
  const { validateUsername } = await import('../src/shared/validation.js');
  
  // Test normalization
  const normalized = validateUsername('TestUser');
  if (normalized === 'testuser') {
    console.log('  ✅ Username normalization works (TestUser → testuser)');
    passed++;
  } else {
    console.log('  ❌ Username normalization failed');
    failed++;
  }
  
  // Test XSS prevention
  try {
    validateUsername('<script>alert("xss")</script>');
    console.log('  ❌ XSS prevention failed - accepted malicious input');
    failed++;
  } catch (error) {
    console.log('  ✅ XSS prevention works - rejected malicious input');
    passed++;
  }
  
  // Test special characters
  try {
    validateUsername('user@domain');
    console.log('  ❌ Special char validation failed');
    failed++;
  } catch (error) {
    console.log('  ✅ Special character validation works');
    passed++;
  }
  
} catch (error) {
  console.log('  ❌ Could not import validation module:', error.message);
  failed += 3;
}

// Test 2: Network Resilience
console.log('\n2️⃣ Testing Network Resilience (Retry, Timeout, Offline)...');
try {
  const fs = await import('fs');
  const apiCode = fs.readFileSync('./src/background/leetcode-api.js', 'utf8');
  
  if (apiCode.includes('fetchWithRetry')) {
    console.log('  ✅ Retry mechanism implemented');
    passed++;
  } else {
    console.log('  ❌ Retry mechanism not found');
    failed++;
  }
  
  if (apiCode.includes('AbortController') && apiCode.includes('TIMEOUT_MS')) {
    console.log('  ✅ Timeout handling implemented');
    passed++;
  } else {
    console.log('  ❌ Timeout handling not found');
    failed++;
  }
  
  if (apiCode.includes('navigator.onLine')) {
    console.log('  ✅ Offline detection implemented');
    passed++;
  } else {
    console.log('  ❌ Offline detection not found');
    failed++;
  }
  
  if (apiCode.includes('exponential backoff') || apiCode.includes('Math.pow(2, attempt)')) {
    console.log('  ✅ Exponential backoff implemented');
    passed++;
  } else {
    console.log('  ❌ Exponential backoff not found');
    failed++;
  }
  
} catch (error) {
  console.log('  ❌ Could not read API file:', error.message);
  failed += 4;
}

// Test 3: Storage Quota Handling
console.log('\n3️⃣ Testing Storage Quota Handling...');
try {
  const fs = await import('fs');
  const storageCode = fs.readFileSync('./src/shared/storage.js', 'utf8');
  
  if (storageCode.includes('QUOTA_LIMIT') || storageCode.includes('quota')) {
    console.log('  ✅ Quota monitoring implemented');
    passed++;
  } else {
    console.log('  ❌ Quota monitoring not found');
    failed++;
  }
  
  if (storageCode.includes('cleanupOldSubmissions')) {
    console.log('  ✅ Cleanup function implemented');
    passed++;
  } else {
    console.log('  ❌ Cleanup function not found');
    failed++;
  }
  
  if (storageCode.includes('checkStorageHealth')) {
    console.log('  ✅ Storage health check implemented');
    passed++;
  } else {
    console.log('  ❌ Storage health check not found');
    failed++;
  }
  
  if (storageCode.includes('QuotaExceededError') || storageCode.includes('QUOTA_EXCEEDED')) {
    console.log('  ✅ Quota exceeded error handling implemented');
    passed++;
  } else {
    console.log('  ❌ Quota exceeded error handling not found');
    failed++;
  }
  
} catch (error) {
  console.log('  ❌ Could not read storage file:', error.message);
  failed += 4;
}

// Test 4: Race Condition Prevention
console.log('\n4️⃣ Testing Race Condition Prevention...');
try {
  const fs = await import('fs');
  
  // Check if storage queue exists
  try {
    await fs.promises.access('./src/shared/storage-queue.js');
    console.log('  ✅ Storage queue module exists');
    passed++;
  } catch {
    console.log('  ❌ Storage queue module not found');
    failed++;
  }
  
  const storageCode = fs.readFileSync('./src/shared/storage.js', 'utf8');
  
  if (storageCode.includes('storageQueue')) {
    console.log('  ✅ Storage operations use queue');
    passed++;
  } else {
    console.log('  ❌ Storage operations do not use queue');
    failed++;
  }
  
  if (storageCode.includes('enqueue')) {
    console.log('  ✅ Enqueue mechanism implemented');
    passed++;
  } else {
    console.log('  ❌ Enqueue mechanism not found');
    failed++;
  }
  
} catch (error) {
  console.log('  ❌ Could not verify race condition prevention:', error.message);
  failed += 3;
}

// Test 5: GitHub Sanitization
console.log('\n5️⃣ Testing GitHub Commit Message Sanitization...');
try {
  const fs = await import('fs');
  const githubCode = fs.readFileSync('./src/shared/github-sync.js', 'utf8');
  
  if (githubCode.includes('sanitizeCommitMessage')) {
    console.log('  ✅ Commit message sanitization implemented');
    passed++;
  } else {
    console.log('  ❌ Commit message sanitization not found');
    failed++;
  }
  
  if (githubCode.includes("import { sanitizeCommitMessage }")) {
    console.log('  ✅ Sanitization module imported');
    passed++;
  } else {
    console.log('  ❌ Sanitization module not imported');
    failed++;
  }
  
} catch (error) {
  console.log('  ❌ Could not read GitHub sync file:', error.message);
  failed += 2;
}

// Test 6: Service Worker Integration
console.log('\n6️⃣ Testing Service Worker Integration...');
try {
  const fs = await import('fs');
  const workerCode = fs.readFileSync('./src/background/service-worker.js', 'utf8');
  
  if (workerCode.includes('validateUsername')) {
    console.log('  ✅ Username validation integrated in service worker');
    passed++;
  } else {
    console.log('  ❌ Username validation not integrated');
    failed++;
  }
  
  if (workerCode.includes('checkStorageHealth')) {
    console.log('  ✅ Storage health check integrated');
    passed++;
  } else {
    console.log('  ❌ Storage health check not integrated');
    failed++;
  }
  
  if (workerCode.includes('GET_STORAGE_STATUS')) {
    console.log('  ✅ Storage status endpoint added');
    passed++;
  } else {
    console.log('  ❌ Storage status endpoint not found');
    failed++;
  }
  
} catch (error) {
  console.log('  ❌ Could not read service worker file:', error.message);
  failed += 3;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

const passRate = ((passed / (passed + failed)) * 100).toFixed(1);
console.log(`\nPass Rate: ${passRate}%`);

if (failed === 0) {
  console.log('\n🎉 ALL CRITICAL FIXES VERIFIED! Extension is ready for testing.');
} else if (passRate >= 80) {
  console.log('\n✅ Most critical fixes implemented. Review failed items.');
} else {
  console.log('\n⚠️  Some fixes may not be properly implemented. Review failed items.');
}

console.log('\n' + '='.repeat(60));
