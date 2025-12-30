import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildExtension() {
  const distDir = path.join(__dirname, '../dist');
  const publicDir = path.join(__dirname, '../public');
  const videoDir = path.join(__dirname, '../video');
  
  console.log('📦 Building Chrome Extension...');
  
  // Ensure dist directory exists
  await fs.ensureDir(distDir);
  
  // Copy video files from video folder to public folder
  console.log('🎬 Copying video assets...');
  try {
    await fs.ensureDir(publicDir);
    const videoFiles = await fs.readdir(videoDir);
    for (const file of videoFiles) {
      const srcPath = path.join(videoDir, file);
      const destPath = path.join(publicDir, file);
      await fs.copy(srcPath, destPath, { overwrite: true });
      console.log(`   ✓ Copied ${file}`);
    }
  } catch (err) {
    console.warn('⚠️  Could not copy video files:', err.message);
  }
  
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
  
  // Ensure content script exists at root for Chrome
  const contentSrc = path.join(distDir, 'content/leetcode-integration.js');
  const contentDest = path.join(distDir, 'leetcode-integration.js');
  
  if (await fs.pathExists(contentSrc)) {
    console.log('🔄 Moving content script to root...');
    await fs.move(contentSrc, contentDest, { overwrite: true });
    
    // Clean up empty content directory
    const contentDir = path.join(distDir, 'content');
    try {
      await fs.remove(contentDir);
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