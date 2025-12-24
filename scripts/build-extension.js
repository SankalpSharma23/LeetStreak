import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildExtension() {
  const distDir = path.join(__dirname, '../dist');
  const publicDir = path.join(__dirname, '../public');
  
  console.log('📦 Building Chrome Extension...');
  
  // Ensure dist directory exists
  await fs.ensureDir(distDir);
  
  // Copy public folder (manifest.json and icons)
  console.log('📄 Copying manifest and icons...');
  await fs.copy(publicDir, distDir);
  
  // Ensure background script exists at root for Chrome
  const backgroundSrc = path.join(distDir, 'background/service-worker.js');
  const backgroundDest = path.join(distDir, 'service-worker.js');
  
  if (await fs.pathExists(backgroundSrc)) {
    console.log('🔄 Moving background script to root...');
    await fs.move(backgroundSrc, backgroundDest, { overwrite: true });
    
    // Clean up empty background directory
    const backgroundDir = path.join(distDir, 'background');
    try {
      await fs.remove(backgroundDir);
    } catch (err) {
      // Directory might not be empty if there are other files
    }
  }
  
  console.log('✅ Extension built successfully!');
  console.log('\n📂 Load unpacked extension from:', distDir);
  console.log('\nTo load in Chrome:');
  console.log('1. Open chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log('3. Click "Load unpacked"');
  console.log('4. Select the "dist" folder');
}

// Handle errors
buildExtension().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});