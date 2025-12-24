/**
 * LeetCode Page Content Script
 * Injects "Add to Queue" and "Code Screenshot" buttons
 */

(function() {
  'use strict';
  
  console.log('LeetStreak: Content script loaded');
  
  let buttonsInjected = false;
  let currentProblemData = null;
  
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
  
  // Create button element
  function createButton(text, icon, onClick) {
    const button = document.createElement('button');
    button.className = 'leetstreak-btn';
    button.innerHTML = `
      <span class="icon">${icon}</span>
      <span class="text">${text}</span>
    `;
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      margin-left: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
    });
    
    button.addEventListener('click', onClick);
    
    return button;
  }
  
  // Handle Add to Queue
  async function handleAddToQueue() {
    currentProblemData = extractProblemData();
    
    if (!currentProblemData) {
      showNotification('❌ Could not extract problem data', 'error');
      return;
    }
    
    try {
      // Get existing queue
      const result = await chrome.storage.local.get('problem_queue');
      const queue = result.problem_queue || [];
      
      // Check if already in queue
      const exists = queue.some(p => p.slug === currentProblemData.slug);
      if (exists) {
        showNotification('📋 Already in queue!', 'info');
        return;
      }
      
      // Add to queue
      queue.push({
        ...currentProblemData,
        addedAt: Date.now(),
        status: 'pending' // pending, in-progress, completed
      });
      
      await chrome.storage.local.set({ problem_queue: queue });
      showNotification('✅ Added to queue!', 'success');
      
    } catch (error) {
      console.error('Error adding to queue:', error);
      showNotification('❌ Failed to add to queue', 'error');
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
      
      document.getElementById('leetstreak-copy-screenshot')?.addEventListener('click', () => {
        copyScreenshotToClipboard();
      });
      
      document.getElementById('leetstreak-download-screenshot')?.addEventListener('click', () => {
        downloadScreenshot(problemData.title);
      });
    }, 100);
  }
  
  // Generate beautiful screenshot HTML
  function generateScreenshotHTML(problemData, code, language) {
    const themeColors = {
      primary: '#667eea',
      secondary: '#764ba2',
      easy: '#00b8a3',
      medium: '#ffc01e',
      hard: '#ef4743'
    };
    
    const difficultyColor = themeColors[problemData.difficulty.toLowerCase()] || themeColors.medium;
    
    return `
      <div style="padding: 24px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 24px; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;">
            Code Screenshot Preview
          </h2>
          <button id="leetstreak-close-modal" style="
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #666;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
          ">×</button>
        </div>
        
        <!-- Screenshot Content -->
        <div id="leetstreak-screenshot-content" style="
          background: linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%);
          border-radius: 12px;
          padding: 32px;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
        ">
          <!-- Problem Header -->
          <div style="margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <span style="
                background: ${difficultyColor};
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
              ">${problemData.difficulty}</span>
              ${problemData.number ? `<span style="opacity: 0.8; font-size: 14px;">#${problemData.number}</span>` : ''}
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">
              ${problemData.title}
            </h1>
          </div>
          
          <!-- Code Block -->
          <div style="
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 20px;
            backdrop-filter: blur(10px);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 13px; opacity: 0.8; font-weight: 600;">${language}</span>
              <span style="font-size: 12px; opacity: 0.6;">${new Date().toLocaleDateString()}</span>
            </div>
            <pre style="
              margin: 0;
              font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
              font-size: 14px;
              line-height: 1.6;
              overflow-x: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
            ">${escapeHtml(code)}</pre>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; opacity: 0.8; font-size: 13px;">
            <span>🔥 LeetStreak</span>
            <span>leetcode.com</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
          <button id="leetstreak-copy-screenshot" style="
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">📋 Copy as Image</button>
          <button id="leetstreak-download-screenshot" style="
            padding: 10px 20px;
            background: #764ba2;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">💾 Download PNG</button>
        </div>
        
        <p style="margin-top: 12px; font-size: 12px; color: #666; text-align: center;">
          💡 Tip: Right-click on the preview above to save it manually
        </p>
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
  
  // Download screenshot
  async function downloadScreenshot(problemTitle) {
    try {
      const element = document.getElementById('leetstreak-screenshot-content');
      if (!element) return;
      
      // Use html2canvas if available
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: 2
        });
        
        const link = document.createElement('a');
        link.download = `${problemTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        showNotification('✅ Downloaded!', 'success');
      } else {
        // Fallback: Right-click save
        showNotification('💡 Right-click on preview to save', 'info');
      }
    } catch (error) {
      console.error('Download error:', error);
      showNotification('❌ Download failed', 'error');
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
    if (buttonsInjected) return;
    
    // Find the target location (near console/submit buttons area)
    const targetSelectors = [
      'div[class*="flex items-center"] button[class*="rounded"]', // Near submit button
      'div[class*="action"] button',
      'button[data-e2e-locator="console-submit-button"]'
    ];
    
    let targetElement = null;
    for (const selector of targetSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        targetElement = elements[0].parentElement;
        break;
      }
    }
    
    if (!targetElement) {
      console.log('LeetStreak: Could not find injection point');
      return;
    }
    
    // Create container for our buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'leetstreak-buttons';
    buttonContainer.style.cssText = `
      display: inline-flex;
      gap: 8px;
      align-items: center;
    `;
    
    // Create buttons
    const queueButton = createButton('Add to Queue', '📋', handleAddToQueue);
    const screenshotButton = createButton('Code Screenshot', '📸', handleCodeScreenshot);
    
    buttonContainer.appendChild(queueButton);
    buttonContainer.appendChild(screenshotButton);
    
    // Insert into page
    targetElement.appendChild(buttonContainer);
    
    buttonsInjected = true;
    console.log('LeetStreak: Buttons injected successfully');
  }
  
  // Initialize
  function init() {
    if (!isProblemPage()) {
      console.log('LeetStreak: Not on a problem page');
      return;
    }
    
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(injectButtons, 2000);
      });
    } else {
      setTimeout(injectButtons, 2000);
    }
    
    // Use MutationObserver to handle dynamic content
    const observer = new MutationObserver(() => {
      if (isProblemPage() && !buttonsInjected) {
        injectButtons();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Load html2canvas library dynamically
  function loadHtml2Canvas() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => {
      console.log('LeetStreak: html2canvas loaded');
    };
    document.head.appendChild(script);
  }
  
  // Start
  init();
  loadHtml2Canvas();
  
})();
