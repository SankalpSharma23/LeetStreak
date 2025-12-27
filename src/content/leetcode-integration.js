/**
 * LeetCode Page Content Script
 * Injects "Add to Queue" and "Code Screenshot" buttons
 * GitHub Auto-Sync functionality
 */

(function() {
  'use strict';
  
  console.log('LeetStreak: Content script loaded');
  
  let buttonsInjected = false;
  let currentProblemData = null;
  let githubSyncEnabled = false;
  let submissionWatcher = null;
  
  // Check if we're on a problem page
  function isProblemPage() {
    return window.location.pathname.startsWith('/problems/') && 
           window.location.pathname !== '/problems/';
  }
  
  // Extract problem information
  function extractProblemData() {
    try {
      // Get problem title
      const titleElement = document.querySelector('[data-cy="question-title"]') || 
                          document.querySelector('div[class*="text-title"]');
      const title = titleElement ? titleElement.textContent.trim() : 'Unknown Problem';
      
      // Get problem slug from URL
      const slug = window.location.pathname.split('/problems/')[1]?.split('/')[0] || '';
      
      // Get difficulty
      const difficultyElement = document.querySelector('div[diff]') ||
                               document.querySelector('[class*="text-difficulty"]');
      const difficulty = difficultyElement ? difficultyElement.textContent.trim() : 'Medium';
      
      // Get problem description
      const descriptionElement = document.querySelector('[data-track-load="description_content"]') ||
                                document.querySelector('[class*="elfjS"]');
      const description = descriptionElement ? descriptionElement.textContent.trim().substring(0, 500) : '';
      
      // Get problem number
      const numberMatch = title.match(/^(\d+)\./);
      const number = numberMatch ? numberMatch[1] : '';
      
      return {
        title: title,
        slug: slug,
        difficulty: difficulty,
        description: description,
        number: number,
        url: window.location.href
      };
    } catch (error) {
      console.error('Error extracting problem data:', error);
      return null;
    }
  }
  
  // Extract user's code
  function extractCode() {
    try {
      // Try to get code from Monaco editor
      const codeEditors = document.querySelectorAll('.view-lines');
      if (codeEditors.length > 0) {
        const codeLines = Array.from(codeEditors[0].querySelectorAll('.view-line'));
        return codeLines.map(line => line.textContent).join('\n');
      }
      
      // Fallback: try textarea
      const textarea = document.querySelector('textarea[class*="code"]');
      if (textarea) {
        return textarea.value;
      }
      
      return '';
    } catch (error) {
      console.error('Error extracting code:', error);
      return '';
    }
  }
  
  // Get selected language
  function getSelectedLanguage() {
    try {
      const langButton = document.querySelector('button[id*="lang"]') ||
                        document.querySelector('[class*="lang-select"]');
      return langButton ? langButton.textContent.trim() : 'Python';
    } catch (error) {
      return 'Python';
    }
  }
  
  // Create button element with modern, smooth UI
  function createButton(text, icon, onClick, isFloating = false) {
    const button = document.createElement('button');
    button.className = isFloating ? 'leetstreak-floating-btn' : 'leetstreak-btn';
    
    // Create smooth gradient background - LeetCode Premium style (gold)
    const gradientColors = isFloating 
      ? 'linear-gradient(135deg, #ffa116 0%, #f89f1b 50%, #ffc01e 100%)'
      : 'linear-gradient(135deg, #ffa116 0%, #f89f1b 100%)';
    
    button.innerHTML = `
      <span class="icon" style="display: inline-block; transition: transform 0.3s ease;">${icon}</span>
      <span class="text">${text}</span>
    `;
    
    if (isFloating) {
      button.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px 24px;
        background: ${gradientColors};
        color: #1a1a1a;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(255, 161, 22, 0.35);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: 0.3px;
        text-transform: none;
      `;
    } else {
      button.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 16px;
        margin-left: 10px;
        background: ${gradientColors};
        color: #1a1a1a;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(255, 161, 22, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: 0.2px;
        position: relative;
        overflow: hidden;
        text-transform: none;
      `;
      
      // Add shimmer effect on hover
      const shimmer = document.createElement('span');
      shimmer.style.cssText = `
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.5s ease;
      `;
      button.appendChild(shimmer);
      
      button.addEventListener('mouseenter', () => {
        shimmer.style.left = '100%';
      });
    }
    
    // Enhanced hover effects
    button.addEventListener('mouseenter', () => {
      if (isFloating) {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 16px rgba(255, 161, 22, 0.45)';
      } else {
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = '0 4px 12px rgba(255, 161, 22, 0.4)';
      }
      button.querySelector('.icon').style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      if (isFloating) {
        button.style.boxShadow = '0 4px 12px rgba(255, 161, 22, 0.35)';
      } else {
        button.style.boxShadow = '0 2px 8px rgba(255, 161, 22, 0.3)';
      }
      button.querySelector('.icon').style.transform = 'scale(1)';
    });
    
    button.addEventListener('mousedown', () => {
      button.style.transform = 'translateY(0) scale(0.98)';
    });
    
    button.addEventListener('mouseup', () => {
      if (isFloating) {
        button.style.transform = 'translateY(-2px)';
      } else {
        button.style.transform = 'translateY(-1px)';
      }
    });
    
    // Add click animation
    button.addEventListener('click', (e) => {
      // Ripple effect
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
      `;
      
      // Add animation keyframes if not already added
      if (!document.getElementById('leetstreak-ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'leetstreak-ripple-animation';
        style.textContent = `
          @keyframes ripple {
            to {
              transform: scale(4);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
      
      onClick(e);
    });
    
    return button;
  }
  
  // Create floating action button as fallback
  function createFloatingButton() {
    // Remove if already exists
    const existing = document.getElementById('leetstreak-floating-menu');
    if (existing) return;
    
    const container = document.createElement('div');
    container.id = 'leetstreak-floating-menu';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 10000;
    `;
    
    const queueBtn = createButton('Queue', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="15" y1="10" x2="9" y2="10"/></svg>', handleAddToQueue, true);
    const screenshotBtn = createButton('Screenshot', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', handleCodeScreenshot, true);
    
    queueBtn.style.bottom = '80px';
    screenshotBtn.style.bottom = '20px';
    
    container.appendChild(queueBtn);
    container.appendChild(screenshotBtn);
    
    document.body.appendChild(container);
    console.log('LeetStreak: Floating buttons added as fallback');
  }
  
  // Check if extension context is still valid
  function isExtensionContextValid() {
    try {
      // Try to access chrome.runtime - this will throw if context is invalidated
      return typeof chrome !== 'undefined' && 
             typeof chrome.storage !== 'undefined' && 
             typeof chrome.storage.local !== 'undefined';
    } catch (e) {
      return false;
    }
  }
  
  // Safe storage access helper
  async function safeStorageGet(key) {
    // Check context first
    if (!isExtensionContextValid()) {
      showNotification('⚠️ Extension reloaded. Please refresh this page (F5).', 'error');
      throw new Error('Extension context invalidated');
    }
    
    try {
      return await chrome.storage.local.get(key);
    } catch (error) {
      const errorMsg = error.message || error.toString() || '';
      const isInvalidated = errorMsg.includes('Extension context invalidated') || 
                           errorMsg.includes('context invalidated') ||
                           errorMsg.includes('message port closed') ||
                           !isExtensionContextValid();
      
      if (isInvalidated) {
        showNotification('⚠️ Extension reloaded. Please refresh this page (F5) to continue.', 'error');
        throw new Error('Extension context invalidated');
      }
      throw error;
    }
  }
  
  async function safeStorageSet(data) {
    // Check context first
    if (!isExtensionContextValid()) {
      showNotification('⚠️ Extension reloaded. Please refresh this page (F5).', 'error');
      throw new Error('Extension context invalidated');
    }
    
    try {
      return await chrome.storage.local.set(data);
    } catch (error) {
      const errorMsg = error.message || error.toString() || '';
      const isInvalidated = errorMsg.includes('Extension context invalidated') || 
                           errorMsg.includes('context invalidated') ||
                           errorMsg.includes('message port closed') ||
                           !isExtensionContextValid();
      
      if (isInvalidated) {
        showNotification('⚠️ Extension reloaded. Please refresh this page (F5) to continue.', 'error');
        throw new Error('Extension context invalidated');
      }
      throw error;
    }
  }
  
  // Handle Add to Queue - Use message passing to avoid context issues
  async function handleAddToQueue() {
    currentProblemData = extractProblemData();
    
    if (!currentProblemData) {
      showNotification('❌ Could not extract problem data', 'error');
      return;
    }
    
    try {
      // Use chrome.runtime.sendMessage instead of direct storage access
      // This avoids extension context invalidated errors
      const response = await new Promise((resolve, reject) => {
        try {
          if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            reject(new Error('Extension not available'));
            return;
          }
          
          chrome.runtime.sendMessage(
            {
              type: 'ADD_TO_QUEUE',
              problemData: currentProblemData
            },
            (response) => {
              // Check for errors
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            }
          );
        } catch (error) {
          reject(error);
        }
      });
      
      if (response.success) {
        const msg = response.status === 'completed' 
          ? '✅ Added to queue! (Already Submitted ✓)' 
          : '✅ Added to queue!';
        showNotification(msg, 'success');
      } else {
        if (response.alreadyExists) {
          showNotification('📋 Already in queue!', 'info');
        } else {
          showNotification('❌ ' + (response.error || 'Failed to add to queue'), 'error');
        }
      }
      
    } catch (error) {
      console.error('Error adding to queue:', error);
      const errorMsg = error.message || error.toString() || '';
      
      if (errorMsg.includes('Extension context invalidated') || 
          errorMsg.includes('message port closed') ||
          errorMsg.includes('Extension not available')) {
        showNotification('⚠️ Extension reloaded. Please refresh this page (F5).', 'error');
      } else {
        showNotification('❌ Failed to add to queue: ' + errorMsg.substring(0, 50), 'error');
      }
    }
  }
  
  // Handle Code Screenshot
  async function handleCodeScreenshot() {
    currentProblemData = extractProblemData();
    const code = extractCode();
    const language = getSelectedLanguage();
    
    if (!code) {
      showNotification('❌ No code found. Write some code first!', 'error');
      return;
    }
    
    showNotification('📸 Generating screenshot...', 'info');
    
    // Create screenshot modal
    createScreenshotModal(currentProblemData, code, language);
  }
  
  // Create screenshot preview modal
  function createScreenshotModal(problemData, code, language) {
    // Remove existing modal if any
    const existingModal = document.getElementById('leetstreak-screenshot-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'leetstreak-screenshot-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;
    
    // Create content container
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      max-width: 900px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    // Generate screenshot HTML
    content.innerHTML = generateScreenshotHTML(problemData, code, language);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Add event listeners for buttons
    setTimeout(() => {
      document.getElementById('leetstreak-close-modal')?.addEventListener('click', () => {
        modal.remove();
      });
      
      document.getElementById('leetstreak-download-screenshot')?.addEventListener('click', () => {
        downloadScreenshot(problemData.title);
      });
    }, 100);
  }
  
  // Generate beautiful screenshot HTML with updated colors and fonts
  function generateScreenshotHTML(problemData, code, language) {
    const difficultyColors = {
      easy: '#22c55e',
      medium: '#eab308',
      hard: '#ef4444'
    };
    
    const difficultyColor = difficultyColors[problemData.difficulty.toLowerCase()] || difficultyColors.medium;
    // New gradient: blue to purple
    const bgGradient = `linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #ec4899 100%)`;
    
    return `
      <div style="padding: 40px; background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); min-height: 100vh;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
          <h2 style="margin: 0; font-size: 32px; color: #1e293b; font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 800; letter-spacing: -0.5px;">
            Code Screenshot
          </h2>
          <button id="leetstreak-close-modal" style="
            background: #e2e8f0;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #64748b;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            transition: all 0.2s ease;
            font-weight: 300;
          " onmouseover="this.style.background='#cbd5e1'; this.style.color='#475569';" 
             onmouseout="this.style.background='#e2e8f0'; this.style.color='#64748b';">×</button>
        </div>
        
        <!-- Screenshot Content -->
        <div id="leetstreak-screenshot-content" style="
          background: ${bgGradient};
          border-radius: 28px;
          padding: 48px;
          color: #ffffff;
          font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          box-shadow: 0 25px 70px rgba(30, 64, 175, 0.4);
        ">
          <!-- Problem Header -->
          <div style="margin-bottom: 36px;">
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px;">
              <span style="
                background: ${difficultyColor};
                padding: 8px 18px;
                border-radius: 14px;
                font-size: 14px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: white;
                box-shadow: 0 6px 16px ${difficultyColor}50;
                font-family: 'Inter', sans-serif;
              ">${problemData.difficulty}</span>
              ${problemData.number ? `<span style="opacity: 0.95; font-size: 16px; font-weight: 700; font-family: 'Inter', sans-serif;">#${problemData.number}</span>` : ''}
            </div>
            <h1 style="margin: 0; font-size: 36px; font-weight: 900; line-height: 1.2; color: #ffffff; font-family: 'Inter', sans-serif; letter-spacing: -0.8px;">
              ${problemData.title}
            </h1>
          </div>
          
          <!-- Code Block -->
          <div style="
            background: rgba(0, 0, 0, 0.35);
            border-radius: 20px;
            padding: 28px;
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.15);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.15);">
              <span style="font-size: 15px; opacity: 1; font-weight: 800; color: ${difficultyColor}; font-family: 'Inter', sans-serif; letter-spacing: 0.5px;">${language}</span>
              <span style="font-size: 14px; opacity: 0.85; font-weight: 600; font-family: 'Inter', sans-serif;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <pre style="
              margin: 0;
              font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', monospace;
              font-size: 16px;
              line-height: 2;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
              color: #f8fafc;
              font-weight: 500;
            ">${escapeHtml(code)}</pre>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 36px; display: flex; justify-content: space-between; align-items: center; opacity: 0.95; font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif;">
            <span style="color: ${difficultyColor}; font-size: 16px;">🔥 LeetStreak</span>
            <span style="font-weight: 600;">leetcode.com</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 16px; margin-top: 40px; justify-content: center;">
          <button id="leetstreak-download-screenshot" style="
            padding: 16px 36px;
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
            color: white;
            border: none;
            border-radius: 18px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
            font-family: 'Inter', 'SF Pro Display', sans-serif;
            letter-spacing: 0.3px;
          " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px rgba(20, 184, 166, 0.5)';" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(20, 184, 166, 0.4)';"
             onmousedown="this.style.transform='translateY(-1px)';"
             onmouseup="this.style.transform='translateY(-3px)';">
            💾 Download PNG
          </button>
        </div>
      </div>
    `;
  }
  
  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Copy screenshot to clipboard
  async function copyScreenshotToClipboard() {
    try {
      const element = document.getElementById('leetstreak-screenshot-content');
      if (!element) return;
      
      // Use html2canvas library if available, otherwise show fallback message
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: 2
        });
        
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showNotification('✅ Copied to clipboard!', 'success');
          } catch (err) {
            showNotification('❌ Copy failed. Try download instead.', 'error');
          }
        });
      } else {
        showNotification('📥 Use Download button instead', 'info');
      }
    } catch (error) {
      console.error('Copy error:', error);
      showNotification('❌ Copy failed', 'error');
    }
  }
  
  // Download screenshot - Improved version with better error handling
  async function downloadScreenshot(problemTitle) {
    try {
      const element = document.getElementById('leetstreak-screenshot-content');
      if (!element) {
        showNotification('❌ Screenshot element not found', 'error');
        return;
      }
      
      showNotification('📸 Generating screenshot...', 'info');
      
      // Wait for html2canvas if it's loading
      let attempts = 0;
      while (typeof html2canvas === 'undefined' && attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (typeof html2canvas === 'undefined') {
        // Try to load from CDN as last resort
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = () => {
            console.log('html2canvas loaded from CDN');
            resolve();
          };
          script.onerror = () => reject(new Error('Failed to load html2canvas'));
          document.head.appendChild(script);
        }).catch(() => {
          showNotification('❌ Please refresh the page to enable downloads', 'error');
          return;
        });
      }
      
      // Proceed with download
      await proceedWithDownload(element, problemTitle);
    } catch (error) {
      console.error('Download error:', error);
      showNotification('❌ Download failed: ' + (error.message || 'Unknown error'), 'error');
    }
  }
  
  async function proceedWithDownload(element, problemTitle) {
    try {
      if (typeof html2canvas === 'undefined') {
        showNotification('❌ html2canvas not available. Loading...', 'info');
        // Wait a bit more and try again
        await new Promise(resolve => setTimeout(resolve, 500));
        if (typeof html2canvas === 'undefined') {
          showNotification('❌ Please refresh the page to enable downloads', 'error');
          return;
        }
      }
      
      showNotification('📸 Capturing screenshot...', 'info');
      
      // Use html2canvas with better settings
      const canvas = await html2canvas(element, {
        backgroundColor: '#1e40af',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
        removeContainer: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure all styles are preserved in the clone
          const clonedElement = clonedDoc.getElementById('leetstreak-screenshot-content');
          if (clonedElement) {
            clonedElement.style.visibility = 'visible';
          }
        }
      });
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          showNotification('❌ Failed to generate image blob', 'error');
          return;
        }
        
        try {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const safeTitle = (problemTitle || 'code_screenshot')
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 50);
          link.download = `${safeTitle}_${Date.now()}.png`;
          link.href = url;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          
          // Trigger download
          link.click();
          
          // Cleanup after a delay
          setTimeout(() => {
            try {
              if (document.body.contains(link)) {
                document.body.removeChild(link);
              }
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error('Cleanup error:', e);
            }
          }, 100);
          
          showNotification('✅ Downloaded successfully!', 'success');
        } catch (error) {
          console.error('Download link error:', error);
          showNotification('❌ Download failed: ' + error.message, 'error');
        }
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('Download processing error:', error);
      const errorMsg = error.message || 'Unknown error';
      showNotification('❌ Download failed: ' + errorMsg, 'error');
    }
  }
  
  // Show notification
  function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.getElementById('leetstreak-notification');
    if (existing) {
      existing.remove();
    }
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#667eea'
    };
    
    const notification = document.createElement('div');
    notification.id = 'leetstreak-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // Inject buttons into the page
  function injectButtons() {
    try {
      if (buttonsInjected) return;
      
      console.log('LeetStreak: Attempting to inject buttons...');
      
      // Check if already exists
      if (document.getElementById('leetstreak-buttons')) {
        console.log('LeetStreak: Buttons already exist');
        buttonsInjected = true;
        return;
      }
      
      // Try multiple strategies to find injection point
      let targetElement = null;
      
      // Strategy 1: Find by testid (most reliable)
      try {
        const testidButton = document.querySelector('[data-e2e-locator*="console"]');
        if (testidButton && testidButton.parentElement) {
          targetElement = testidButton.parentElement.parentElement;
          console.log('LeetStreak: Found via testid');
        }
      } catch (e) {
        // Continue to next strategy
      }
      
      // Strategy 2: Find submit/run buttons container
      if (!targetElement) {
        try {
          const buttons = Array.from(document.querySelectorAll('button'));
          const submitButton = buttons.find(btn => {
            try {
              return btn && btn.textContent && (
                btn.textContent.includes('Submit') || 
                btn.textContent.includes('Run') ||
                btn.textContent.includes('Test')
              );
            } catch {
              return false;
            }
          });
          if (submitButton && submitButton.parentElement) {
            targetElement = submitButton.parentElement;
            console.log('LeetStreak: Found via submit button');
          }
        } catch (e) {
          // Continue to next strategy
        }
      }
      
      // Strategy 3: Find by looking for action buttons area
      if (!targetElement) {
        try {
          const actionDivs = document.querySelectorAll('div[class*="flex"]');
          for (const div of actionDivs) {
            try {
              const hasButtons = div && div.querySelectorAll && div.querySelectorAll('button').length >= 2;
              if (hasButtons && div.offsetHeight > 30) {
                targetElement = div;
                console.log('LeetStreak: Found via flex container');
                break;
              }
            } catch {
              continue;
            }
          }
        } catch (e) {
          // Continue to next strategy
        }
      }
      
      // Strategy 4: Find the header/toolbar area
      if (!targetElement) {
        try {
          const headers = document.querySelectorAll('[class*="header"], [class*="toolbar"]');
          if (headers.length > 0 && headers[0]) {
            targetElement = headers[0];
            console.log('LeetStreak: Found via header');
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (!targetElement) {
        console.log('LeetStreak: Could not find injection point. Will retry...');
        return;
      }
      
      console.log('LeetStreak: Found injection point:', targetElement);
      
      // Create container for our buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'leetstreak-buttons';
      buttonContainer.style.cssText = `
        display: inline-flex;
        gap: 8px;
        align-items: center;
        margin-left: 12px;
        z-index: 100;
      `;
      
      // Create buttons
      const queueButton = createButton('Add to Queue', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="15" y1="10" x2="9" y2="10"/></svg>', handleAddToQueue);
      const screenshotButton = createButton('Code Screenshot', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', handleCodeScreenshot);
      
      buttonContainer.appendChild(queueButton);
      buttonContainer.appendChild(screenshotButton);
      
      // Insert into page
      targetElement.appendChild(buttonContainer);
      
      buttonsInjected = true;
      console.log('LeetStreak: Buttons injected successfully!');
    } catch (error) {
      console.error('LeetStreak: Error in injectButtons:', error);
      // Don't set buttonsInjected to true so it can retry
    }
  }

  // ===== GitHub Auto-Sync Functionality =====
  
  /**
   * Capture code using multiple strategies
   */
  async function captureCodeMultiStrategy() {
    const strategies = [
      captureFromMonacoAPI,
      captureFromTextarea,
      captureFromVisibleLines
    ];

    for (let attempt = 0; attempt < 3; attempt++) {
      for (const strategy of strategies) {
        try {
          const code = await strategy();
          if (code && code.trim().length > 0) {
            return {
              success: true,
              code: code.trim(),
              method: strategy.name
            };
          }
        } catch (error) {
          // Try next strategy
        }
      }
      
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return { success: false, code: null };
  }

  function captureFromMonacoAPI() {
    if (typeof window.monaco === 'undefined' || !window.monaco.editor) {
      throw new Error('Monaco not available');
    }

    const models = window.monaco.editor.getModels();
    if (!models || models.length === 0) {
      throw new Error('No models');
    }

    const solutionModel = models.find(m => 
      !m.uri.toString().includes('test')
    ) || models[0];

    const code = solutionModel.getValue();
    if (!code) throw new Error('Empty');
    
    return code;
  }

  function captureFromTextarea() {
    const textarea = document.querySelector('.monaco-editor textarea') ||
                    document.querySelector('textarea');
    if (textarea && textarea.value) {
      return textarea.value;
    }
    throw new Error('No textarea');
  }

  function captureFromVisibleLines() {
    const lines = document.querySelectorAll('.view-lines .view-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n');
    }
    throw new Error('No visible lines');
  }

  function detectLanguage() {
    // Try Monaco
    try {
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models.length > 0) {
          const lang = models[0].getLanguageId();
          if (lang) return normalizeLanguage(lang);
        }
      }
    } catch (e) {}

    // Try language selector
    const langElement = document.querySelector('[data-mode-id]') ||
                       document.querySelector('.ant-select-selection-item');
    if (langElement) {
      const lang = langElement.getAttribute('data-mode-id') || langElement.textContent;
      if (lang) return normalizeLanguage(lang);
    }

    // Try local storage
    try {
      const globalLang = localStorage.getItem('global_lang');
      if (globalLang) {
        const parsed = JSON.parse(globalLang);
        if (parsed.lang) return normalizeLanguage(parsed.lang);
      }
    } catch (e) {}

    return 'python3';
  }

  function normalizeLanguage(lang) {
    const map = {
      'python': 'python3', 'py': 'python3',
      'javascript': 'javascript', 'js': 'javascript',
      'typescript': 'typescript', 'java': 'java',
      'c++': 'cpp', 'cpp': 'cpp', 'c': 'c',
      'csharp': 'csharp', 'go': 'go', 'rust': 'rust'
    };
    return map[lang.toLowerCase()] || lang.toLowerCase();
  }

  function getLanguageExtension(lang) {
    const map = {
      'python3': 'py', 'javascript': 'js', 'typescript': 'ts',
      'java': 'java', 'cpp': 'cpp', 'c': 'c', 'csharp': 'cs',
      'go': 'go', 'rust': 'rs', 'swift': 'swift', 'kotlin': 'kt'
    };
    return map[lang] || 'txt';
  }
  
  /**
   * Initialize GitHub sync and set up submission monitoring
   */
  async function initGitHubSync() {
    try {
      const result = await safeStorageGet(['github_sync_enabled', 'github_token']);
      
      if (result.github_sync_enabled && result.github_token) {
        githubSyncEnabled = true;
        console.log('LeetStreak: GitHub sync is enabled');
        
        // Monitor for submit button clicks
        setupSubmitButtonListener();
      } else {
        console.log('LeetStreak: GitHub sync is disabled');
      }
    } catch (error) {
      console.error('LeetStreak: Failed to initialize GitHub sync:', error);
    }
  }

  /**
   * Set up listener for Submit Solution button
   */
  function setupSubmitButtonListener() {
    console.log('LeetStreak: Setting up submit button listener...');
    
    // Use event delegation on document
    document.addEventListener('click', async (event) => {
      try {
        const target = event.target;
        
        // Check if clicked element or parent is a submit button
        const button = target.closest('button');
        if (!button) return;
        
        const buttonText = button.textContent || '';
        const isSubmitButton = 
          (buttonText.includes('Submit') && 
          !buttonText.includes('Submission') &&
          button.getAttribute('data-e2e-locator') === 'console-submit-button') ||
          (buttonText.trim() === 'Submit' && !button.disabled);
        
        if (isSubmitButton && githubSyncEnabled) {
          console.log('🚀 LeetStreak: Submit button clicked! Capturing code...');
          await handleSubmissionCapture();
        }
      } catch (error) {
        // Silently ignore errors from extension context invalidation
        if (error.message && error.message.includes('Extension context invalidated')) {
          return;
        }
        console.error('LeetStreak: Error in submit button listener:', error);
      }
    }, true); // Use capture phase
    
    console.log('LeetStreak: Submit button listener active');
  }

  /**
   * Capture code and metadata before submission
   */
  async function handleSubmissionCapture() {
    try {
      console.log('LeetStreak: Starting code capture...');
      
      // Capture code using multi-strategy approach
      const captureResult = await captureCodeMultiStrategy();
      
      console.log('LeetStreak: Code capture result:', captureResult.success ? 'SUCCESS' : 'FAILED');
      
      if (!captureResult.success) {
        console.warn('LeetStreak: Code capture failed');
        showNotification('⚠️ Could not capture code', 'error');
        return;
      }

      console.log('LeetStreak: Code captured:', captureResult.code.length, 'characters');

      // Detect language
      const language = detectLanguage();
      const extension = getLanguageExtension(language);
      
      console.log('LeetStreak: Detected language:', language);

      // Extract problem metadata
      const problemData = extractProblemMetadata();
      
      if (!problemData) {
        console.warn('LeetStreak: Failed to extract problem metadata');
        showNotification('⚠️ Could not extract problem data', 'error');
        return;
      }

      console.log('LeetStreak: Problem data:', problemData.title);

      // Create submission object
      const submission = {
        code: captureResult.code,
        language: language,
        extension: extension,
        problemTitle: problemData.title,
        problemSlug: problemData.slug,
        difficulty: problemData.difficulty,
        topics: problemData.topics || ['Unsorted'],
        questionNumber: problemData.number,
        problemUrl: window.location.href,
        timestamp: Date.now(),
        captureMethod: captureResult.method
      };

      // Store as pending submission
      const submissionId = `pending_${problemData.slug}_${Date.now()}`;
      await safeStorageSet({
        [submissionId]: submission
      });

      console.log('✅ LeetStreak: Code captured and stored as pending:', submissionId);
      showNotification('📝 Code captured! Waiting for result...', 'info');

      // Start watching for "Accepted" status
      startSubmissionWatcher(submissionId, submission);

    } catch (error) {
      console.error('❌ LeetStreak: Submission capture failed:', error);
      showNotification('❌ Capture failed: ' + error.message, 'error');
    }
  }

  /**
   * Extract problem metadata using multiple strategies
   */
  function extractProblemMetadata() {
    try {
      // Extract basic data
      const basicData = extractProblemData();
      
      if (!basicData) {
        return null;
      }

      // Try to extract topics/tags from the page
      const topics = extractTopics();

      return {
        ...basicData,
        topics: topics.length > 0 ? topics : ['Unsorted']
      };
    } catch (error) {
      console.error('Error extracting problem metadata:', error);
      return null;
    }
  }

  /**
   * Extract problem topics/tags
   */
  function extractTopics() {
    const topics = [];
    
    try {
      // Strategy 1: Tags container
      const tagElements = document.querySelectorAll('[class*="topic-tag"]');
      tagElements.forEach(tag => {
        const text = tag.textContent.trim();
        if (text) topics.push(text);
      });

      // Strategy 2: Link elements with topic in href
      if (topics.length === 0) {
        const topicLinks = document.querySelectorAll('a[href*="/tag/"]');
        topicLinks.forEach(link => {
          const text = link.textContent.trim();
          if (text) topics.push(text);
        });
      }

      // Strategy 3: GraphQL data in page
      if (topics.length === 0) {
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.textContent.includes('"topicTags"')) {
            try {
              const match = script.textContent.match(/"topicTags":\s*\[([^\]]+)\]/);
              if (match) {
                const tagsText = match[1];
                const tagMatches = tagsText.matchAll(/"name":"([^"]+)"/g);
                for (const tagMatch of tagMatches) {
                  topics.push(tagMatch[1]);
                }
              }
            } catch (e) {
              // Continue
            }
          }
        });
      }
    } catch (error) {
      console.warn('Error extracting topics:', error);
    }

    return [...new Set(topics)]; // Remove duplicates
  }

  /**
   * Watch for "Accepted" status after submission
   */
  function startSubmissionWatcher(submissionId, submission) {
    console.log('LeetStreak: Starting submission watcher...');
    
    if (submissionWatcher) {
      submissionWatcher.disconnect();
    }

    const timeout = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    let checkCount = 0;

    submissionWatcher = new MutationObserver(async (mutations) => {
      checkCount++;

      // Check for timeout
      if (Date.now() - startTime > timeout) {
        console.log('⏱️ LeetStreak: Submission watch timeout');
        submissionWatcher.disconnect();
        await markSubmissionExpired(submissionId);
        return;
      }

      // Check for "Accepted" status
      if (isSubmissionAccepted()) {
        console.log('✅ LeetStreak: Submission ACCEPTED! Triggering GitHub sync...');
        submissionWatcher.disconnect();
        showNotification('✅ Accepted! Syncing to GitHub...', 'success');
        
        // Send to background worker for GitHub sync
        await triggerGitHubSync(submissionId, submission);
      }

      // Check for failure (stop watching)
      if (isSubmissionFailed()) {
        console.log('❌ LeetStreak: Submission failed, discarding');
        submissionWatcher.disconnect();
        await discardPendingSubmission(submissionId);
      }
    });

    // Watch multiple possible result containers
    const containers = [
      document.body, // Fallback - watch everything
      document.querySelector('[data-e2e-locator="submission-result"]'),
      document.querySelector('#qd-content'),
      document.querySelector('[class*="result"]')
    ].filter(Boolean);

    containers.forEach(container => {
      submissionWatcher.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    });

    console.log(`LeetStreak: Watching for submission result (timeout: ${timeout/1000}s)`);
  }

  /**
   * Check if submission was accepted
   */
  function isSubmissionAccepted() {
    const indicators = [
      // Check for "Accepted" text in various locations
      () => {
        const result = document.querySelector('[data-e2e-locator="submission-result"]');
        if (result && result.textContent.includes('Accepted')) {
          console.log('Found Accepted in submission-result');
          return true;
        }
        return false;
      },
      () => {
        const greenText = document.querySelector('.text-green-500, .text-green-600, [class*="text-green"]');
        if (greenText && greenText.textContent.includes('Accepted')) {
          console.log('Found Accepted in green text');
          return true;
        }
        return false;
      },
      () => {
        const successElements = document.querySelectorAll('[class*="success"]');
        for (const elem of successElements) {
          if (elem.textContent.includes('Accepted')) {
            console.log('Found Accepted in success element');
            return true;
          }
        }
        return false;
      },
      () => {
        // Look for the specific "Accepted" div
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          const text = div.textContent.trim();
          if (text === 'Accepted' && div.className.includes('text')) {
            console.log('Found Accepted div with text class');
            return true;
          }
        }
        return false;
      }
    ];

    return indicators.some(check => {
      try {
        return check();
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if submission failed
   */
  function isSubmissionFailed() {
    const failureKeywords = ['Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compile Error'];
    
    return failureKeywords.some(keyword => {
      const resultElement = document.querySelector('[data-e2e-locator="submission-result"]');
      return resultElement && resultElement.textContent.includes(keyword);
    });
  }

  /**
   * Trigger GitHub sync in background worker
   */
  async function triggerGitHubSync(submissionId, submission) {
    try {
      console.log('LeetStreak: Sending GitHub sync message to background...');
      
      chrome.runtime.sendMessage({
        type: 'GITHUB_SYNC_SUBMISSION',
        submissionId,
        submission
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ LeetStreak: Message error:', chrome.runtime.lastError);
          showNotification('❌ Sync failed: Extension error', 'error');
          return;
        }
        
        if (response && response.success) {
          console.log('✅ LeetStreak: GitHub sync initiated successfully');
        } else {
          console.error('❌ LeetStreak: GitHub sync failed:', response?.error);
          showNotification('❌ Sync failed: ' + (response?.error || 'Unknown error'), 'error');
        }
      });
    } catch (error) {
      console.error('❌ LeetStreak: Failed to trigger GitHub sync:', error);
      showNotification('❌ Sync failed: ' + error.message, 'error');
    }
  }

  /**
   * Mark submission as expired (no result within timeout)
   */
  async function markSubmissionExpired(submissionId) {
    try {
      // Move to failed syncs for manual review
      const result = await safeStorageGet([submissionId]);
      const submission = result[submissionId];
      
      if (submission) {
        const failedSyncs = await safeStorageGet('failed_syncs');
        const failed = failedSyncs.failed_syncs || [];
        
        failed.push({
          submission,
          error: 'Timeout: No result detected within 5 minutes',
          timestamp: Date.now(),
          retryCount: 0
        });

        await safeStorageSet({ failed_syncs: failed });
      }

      // Remove pending submission
      await chrome.storage.local.remove(submissionId);
      console.log('LeetStreak: Marked submission as expired');
    } catch (error) {
      console.error('LeetStreak: Failed to mark submission as expired:', error);
    }
  }

  /**
   * Discard pending submission (failed submission)
   */
  async function discardPendingSubmission(submissionId) {
    try {
      await chrome.storage.local.remove(submissionId);
      console.log('LeetStreak: Discarded pending submission');
    } catch (error) {
      console.error('LeetStreak: Failed to discard submission:', error);
    }
  }

  // ===== End GitHub Auto-Sync =====
  
  // Initialize
  function init() {
    if (!isProblemPage()) {
      console.log('LeetStreak: Not on a problem page');
      return;
    }
    
    console.log('LeetStreak: Initializing on problem page...');
    
    // Load GitHub sync settings
    initGitHubSync();
    
    // Inject buttons after a delay to ensure DOM is ready
    setTimeout(() => {
      if (!buttonsInjected) {
        injectButtons();
      }
    }, 1500);
    
    // Retry injection if it failed
    setTimeout(() => {
      if (!buttonsInjected) {
        console.log('LeetStreak: Retrying button injection...');
        injectButtons();
      }
    }, 4000);
    
    // Watch for URL changes (for SPA navigation)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      try {
        const url = location.href;
        if (url !== lastUrl) {
          lastUrl = url;
          buttonsInjected = false;
          githubSyncEnabled = false; // Reset sync state
          if (isProblemPage()) {
            console.log('LeetStreak: URL changed, re-injecting...');
            initGitHubSync(); // Reinitialize sync
            setTimeout(() => injectButtons(), 2000);
          }
        }
      } catch (error) {
        // Silently handle errors in observer to prevent spam
        if (error.message && !error.message.includes('Extension context')) {
          console.error('LeetStreak: URL observer error:', error);
        }
      }
    });
    
    try {
      urlObserver.observe(document, { subtree: true, childList: true });
    } catch (error) {
      console.error('LeetStreak: Failed to observe URL changes:', error);
    }
  }
  
  // Load html2canvas library dynamically with error handling
  function loadHtml2Canvas() {
    // Check if already loaded
    if (typeof html2canvas !== 'undefined') {
      console.log('LeetStreak: html2canvas already loaded');
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.async = true;
    script.onload = () => {
      console.log('LeetStreak: html2canvas loaded successfully');
    };
    script.onerror = () => {
      console.warn('LeetStreak: Failed to load html2canvas from CDN');
      // Try alternative CDN
      const altScript = document.createElement('script');
      altScript.src = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';
      altScript.async = true;
      altScript.onload = () => console.log('LeetStreak: html2canvas loaded from unpkg');
      altScript.onerror = () => console.error('LeetStreak: All html2canvas CDN sources failed');
      document.head.appendChild(altScript);
    };
    document.head.appendChild(script);
  }
  
  // Start
  init();
  loadHtml2Canvas();
  
})();
