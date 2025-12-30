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
  
  // Check if problem is marked as solved/submitted on the page
  function checkIfProblemSolved() {
    try {
      // Look for "Solved" badge or checkmark icon
      // LeetCode shows solved status with checkmark or "Solved" text
      
      // Check 1: Look for SVG checkmark in problem title area
      const titleArea = document.querySelector('[data-cy="question-title"]')?.parentElement;
      if (titleArea) {
        const checkmarks = titleArea.querySelectorAll('svg[class*="check"], svg[class*="done"]');
        if (checkmarks.length > 0) {
          console.log('Found checkmark in title area');
          return true;
        }
      }
      
      // Check 2: Look for "Solved" text badge
      const allElements = document.querySelectorAll('*');
      for (let elem of allElements) {
        if (elem.textContent === 'Solved' && elem.offsetParent !== null) {
          console.log('Found "Solved" badge');
          return true;
        }
      }
      
      // Check 3: Look for checkmark in the problem header area
      const headerArea = document.querySelector('[data-cy="question-header"]') ||
                        document.querySelector('[class*="header"]');
      if (headerArea) {
        const successIcon = headerArea.querySelector('[class*="success"], [class*="accepted"], svg[class*="fill-green"]');
        if (successIcon) {
          console.log('Found success icon in header');
          return true;
        }
      }
      
      // Check 4: Look for green checkmark SVG anywhere in top section
      const topSection = document.querySelector('[class*="top"], [data-cy="problem-statement"]');
      if (topSection) {
        const svgs = topSection.querySelectorAll('svg');
        for (let svg of svgs) {
          const classes = svg.className.baseVal || svg.className;
          const fill = svg.getAttribute('fill') || svg.style.fill;
          // Green fill indicates accepted/solved
          if ((classes.includes('check') || classes.includes('done')) && 
              (fill === '#22c55e' || fill.includes('green') || classes.includes('green'))) {
            console.log('Found green checkmark SVG');
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if problem solved:', error);
      return false;
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
  
  // Get selected language - improved detection
  function getSelectedLanguage() {
    try {
      // Strategy 1: Try Monaco editor language
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models.length > 0) {
          const lang = models[0].getLanguageId();
          if (lang && lang !== 'plaintext') {
            return normalizeLanguage(lang);
          }
        }
      }
      
      // Strategy 2: Try language selector dropdown button
      const langButton = document.querySelector('button[title*="language"], button[aria-label*="language"]') ||
                        document.querySelector('[class*="lang-select"] button') ||
                        document.querySelector('button[id*="lang"]');
      if (langButton && langButton.textContent) {
        const text = langButton.textContent.trim();
        if (text && text !== '') {
          return normalizeLanguage(text);
        }
      }
      
      // Strategy 3: Try to find language from dropdown menu
      const langDropdown = document.querySelector('[data-mode-id]');
      if (langDropdown) {
        const modeId = langDropdown.getAttribute('data-mode-id');
        if (modeId) {
          return normalizeLanguage(modeId);
        }
      }
      
      // Strategy 4: Try localStorage for language preference
      try {
        const globalLang = localStorage.getItem('global_lang');
        if (globalLang) {
          const parsed = JSON.parse(globalLang);
          if (parsed.lang) {
            return normalizeLanguage(parsed.lang);
          }
        }
      } catch (e) {}
      
      // Default fallback
      return 'python3';
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'python3';
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
    
    // Safely create button content
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.style.cssText = 'display: inline-block; transition: transform 0.3s ease;';
    iconSpan.innerHTML = icon; // SVG is safe - comes from static code
    
    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = text; // Use textContent for user text
    
    button.appendChild(iconSpan);
    button.appendChild(textSpan);
    
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
  function _createFloatingButton() {
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

    // Check if problem is already solved/submitted on the page
    const isSolved = checkIfProblemSolved();
    if (isSolved) {
      currentProblemData.status = 'completed';
      console.log('Problem detected as solved on page');
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
    let language = getSelectedLanguage();
    
    if (!code) {
      showNotification('❌ No code found. Write some code first!', 'error');
      return;
    }
    
    // If language detection failed or defaulted, try to analyze the code
    if (!language || language === 'python3') {
      const detectedLang = analyzeCodeLanguage(code);
      if (detectedLang) {
        language = detectedLang;
        console.log('LeetStreak: Detected language from code analysis:', language);
      }
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
      scrollbar-width: none;
      -ms-overflow-style: none;
    `;
    
    // Hide scrollbar for webkit browsers
    content.style.webkitScrollbar = 'none';
    
    // Generate screenshot HTML safely
    const screenshotElement = generateScreenshotElement(problemData, code, language);
    content.appendChild(screenshotElement);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Add event listeners for buttons - use direct reference instead of setTimeout
    const closeModal = document.getElementById('leetstreak-close-modal');
    const downloadBtn = document.getElementById('leetstreak-download-screenshot');
    
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        modal.remove();
      });
    }
    
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Download button clicked');
        await downloadScreenshot(problemData.title);
      });
    } else {
      console.error('Download button not found in modal');
    }
    
    // Inject CSS to hide scrollbars globally
    injectScrollbarCSS();
  }
  
  // Inject CSS to hide scrollbars
  function injectScrollbarCSS() {
    if (document.getElementById('leetstreak-scrollbar-css')) {
      return; // Already injected
    }
    
    const style = document.createElement('style');
    style.id = 'leetstreak-scrollbar-css';
    style.textContent = `
      #leetstreak-screenshot-modal ::-webkit-scrollbar {
        display: none;
      }
      #leetstreak-screenshot-modal {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      #leetstreak-screenshot-modal * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      #leetstreak-screenshot-modal *::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Generate beautiful screenshot element with safe DOM manipulation
  function generateScreenshotElement(problemData, code, language) {
    const difficultyColors = {
      easy: '#3fb950',
      medium: '#d29922',
      hard: '#da3633'
    };
    
    const difficultyColor = difficultyColors[problemData.difficulty.toLowerCase()] || difficultyColors.medium;
    const bgGradient = `linear-gradient(135deg, #0d1117 0%, #161b22 100%)`;
    
    // Main container
    const container = document.createElement('div');
    container.style.cssText = 'padding: 32px; background: #0d1117; min-height: 100vh;';
    
    // Header section with improved styling
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;';
    
    const title = document.createElement('h2');
    title.textContent = '✨ Code Screenshot';
    title.style.cssText = "margin: 0; font-size: 32px; color: #c9d1d9; font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 800; letter-spacing: -0.5px;";
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'leetstreak-close-modal';
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background: #21262d; border: 1px solid #30363d; font-size: 24px; cursor: pointer; color: #8b949e; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; transition: all 0.2s ease; font-weight: 300;';
    closeBtn.onmouseover = function() { this.style.background='#30363d'; this.style.color='#c9d1d9'; this.style.transform='scale(1.05)'; };
    closeBtn.onmouseout = function() { this.style.background='#21262d'; this.style.color='#8b949e'; this.style.transform='scale(1)'; };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Screenshot content with enhanced styling
    const screenshotContent = document.createElement('div');
    screenshotContent.id = 'leetstreak-screenshot-content';
    screenshotContent.style.cssText = `background: ${bgGradient}; border-radius: 24px; padding: 48px; color: #c9d1d9; font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); border: 1px solid #30363d;`;
    
    // Problem header
    const problemHeader = document.createElement('div');
    problemHeader.style.cssText = 'margin-bottom: 36px;';
    
    const badgeContainer = document.createElement('div');
    badgeContainer.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 16px;';
    
    const difficultyBadge = document.createElement('span');
    difficultyBadge.textContent = problemData.difficulty.toUpperCase();
    difficultyBadge.style.cssText = `background: ${difficultyColor}20; padding: 6px 16px; border-radius: 12px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: ${difficultyColor}; box-shadow: 0 4px 12px ${difficultyColor}20; font-family: 'Inter', sans-serif; border: 1px solid ${difficultyColor}40;`;
    badgeContainer.appendChild(difficultyBadge);
    
    if (problemData.number) {
      const numberSpan = document.createElement('span');
      numberSpan.textContent = `#${problemData.number}`;
      numberSpan.style.cssText = "opacity: 0.9; font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif;";
      badgeContainer.appendChild(numberSpan);
    }
    
    const problemTitle = document.createElement('h1');
    problemTitle.textContent = problemData.title;
    problemTitle.style.cssText = "margin: 0; font-size: 36px; font-weight: 900; line-height: 1.2; color: #e6edf3; font-family: 'Inter', sans-serif; letter-spacing: -0.8px;";
    
    problemHeader.appendChild(badgeContainer);
    problemHeader.appendChild(problemTitle);
    
    // Code block with improved styling
    const codeBlock = document.createElement('div');
    codeBlock.style.cssText = 'background: #0d1117; border-radius: 18px; padding: 28px; border: 1px solid #30363d;';
    
    const codeHeader = document.createElement('div');
    codeHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #30363d;';
    
    const langSpan = document.createElement('span');
    langSpan.textContent = getDisplayLanguageName(language);
    langSpan.style.cssText = `font-size: 14px; opacity: 1; font-weight: 800; color: #58a6ff; font-family: 'Inter', sans-serif; letter-spacing: 0.5px;`;
    
    const dateSpan = document.createElement('span');
    dateSpan.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateSpan.style.cssText = "font-size: 13px; opacity: 0.85; font-weight: 600; font-family: 'Inter', sans-serif; color: #8b949e;";
    
    codeHeader.appendChild(langSpan);
    codeHeader.appendChild(dateSpan);
    
    const codeEl = document.createElement('pre');
    codeEl.textContent = code; // textContent automatically escapes
    codeEl.style.cssText = "margin: 0; font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', monospace; font-size: 15px; line-height: 1.8; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; color: #e6edf3; font-weight: 500; max-height: 400px; overflow-y: auto;";
    
    codeBlock.appendChild(codeHeader);
    codeBlock.appendChild(codeEl);
    
    // Footer with enhanced branding
    const footer = document.createElement('div');
    footer.style.cssText = "margin-top: 36px; display: flex; justify-content: space-between; align-items: center; opacity: 0.95; font-size: 14px; font-weight: 700; font-family: 'Inter', sans-serif;";
    
    const brandSpan = document.createElement('span');
    brandSpan.textContent = '🔥 LeetStreak';
    brandSpan.style.cssText = `color: #58a6ff; font-size: 16px;`;
    
    const urlSpan = document.createElement('span');
    urlSpan.textContent = 'leetcode.com';
    urlSpan.style.cssText = 'font-weight: 600; color: #8b949e;';
    
    footer.appendChild(brandSpan);
    footer.appendChild(urlSpan);
    
    // Assemble screenshot content
    screenshotContent.appendChild(problemHeader);
    screenshotContent.appendChild(codeBlock);
    screenshotContent.appendChild(footer);
    
    // Action buttons with improved styling - positioned at bottom
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText = 'display: flex; gap: 12px; margin-top: 28px; padding-top: 28px; border-top: 1px solid #30363d; justify-content: flex-end; flex-wrap: wrap;';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'leetstreak-download-screenshot';
    downloadBtn.textContent = '⬇️ Download PNG';
    downloadBtn.style.cssText = "padding: 12px 28px; background: #000000; color: #ff8c00; border: 2px solid #ff8c00; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 6px 20px rgba(255, 140, 0, 0.25); font-family: 'Inter', 'SF Pro Display', sans-serif; letter-spacing: 0.3px; white-space: nowrap;";
    downloadBtn.onmouseover = function() { this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 30px rgba(255, 140, 0, 0.35)'; this.style.background='#1a1a1a'; };
    downloadBtn.onmouseout = function() { this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(255, 140, 0, 0.25)'; this.style.background='#000000'; };
    downloadBtn.onmousedown = function() { this.style.transform='translateY(0px)'; };
    downloadBtn.onmouseup = function() { this.style.transform='translateY(-2px)'; };
    
    actionButtons.appendChild(downloadBtn);
    
    // Assemble main container
    container.appendChild(header);
    container.appendChild(screenshotContent);
    container.appendChild(actionButtons);
    
    return container;
  }
  
  // Legacy function for backwards compatibility - now calls the safe version
  function generateScreenshotHTML(problemData, code, language) {
    const element = generateScreenshotElement(problemData, code, language);
    const wrapper = document.createElement('div');
    wrapper.appendChild(element);
    return wrapper.innerHTML;
  }
  
  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Copy screenshot to clipboard
  async function _copyScreenshotToClipboard() {
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
  
  // Download screenshot - Capture visual content exactly as displayed
  async function downloadScreenshot(problemTitle) {
    try {
      console.log('Starting download process...');
      
      const element = document.getElementById('leetstreak-screenshot-content');
      if (!element) {
        console.error('Screenshot element not found');
        showNotification('❌ Screenshot element not found', 'error');
        return;
      }
      
      console.log('Screenshot element found, capturing visual content...');
      showNotification('📸 Capturing screenshot...', 'info');
      
      // Create a wrapper with styling
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.top = '-9999px';
      wrapper.style.left = '-9999px';
      wrapper.style.width = (element.offsetWidth + 96) + 'px';
      wrapper.style.height = (element.offsetHeight + 96) + 'px';
      wrapper.style.padding = '48px';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.background = 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)';
      wrapper.style.borderRadius = '24px';
      wrapper.style.border = '1px solid #30363d';
      wrapper.style.overflow = 'hidden';
      
      // Clone the screenshot content
      const clone = element.cloneNode(true);
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      
      // Get actual rendered dimensions
      const width = wrapper.offsetWidth;
      const height = wrapper.offsetHeight;
      console.log('Wrapper dimensions:', width, 'x', height);
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.scale(dpr, dpr);
      
      // Try using html2canvas if available
      if (typeof html2canvas !== 'undefined') {
        console.log('Using html2canvas to render');
        try {
          const renderedCanvas = await html2canvas(wrapper, {
            backgroundColor: '#0d1117',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: width,
            height: height
          });
          
          document.body.removeChild(wrapper);
          
          console.log('Canvas rendered successfully');
          renderedCanvas.toBlob((blob) => {
            if (blob) {
              console.log('Blob created, size:', blob.size);
              downloadBlob(blob, problemTitle);
            } else {
              console.error('Blob is null');
              showNotification('❌ Failed to create image blob', 'error');
            }
          }, 'image/png', 1.0);
        } catch (error) {
          console.error('html2canvas error:', error);
          document.body.removeChild(wrapper);
          showNotification('❌ Failed to render screenshot', 'error');
        }
      } else {
        console.log('html2canvas not available, loading from CDN');
        // Try to load html2canvas from CDN
        const loaded = await loadHtml2CanvasFromCDN();
        
        document.body.removeChild(wrapper);
        
        if (loaded && typeof html2canvas !== 'undefined') {
          try {
            const renderedCanvas = await html2canvas(wrapper, {
              backgroundColor: '#0d1117',
              scale: 2,
              useCORS: true,
              allowTaint: true,
              logging: false
            });
            
            console.log('Canvas rendered from CDN library');
            renderedCanvas.toBlob((blob) => {
              if (blob) {
                console.log('Blob created, size:', blob.size);
                downloadBlob(blob, problemTitle);
              } else {
                showNotification('❌ Failed to create image', 'error');
              }
            }, 'image/png', 1.0);
          } catch (error) {
            console.error('html2canvas error:', error);
            showNotification('❌ Screenshot capture failed', 'error');
          }
        } else {
          console.log('Fallback: using simple canvas rendering');
          // Fallback to simple rendering
          try {
            // Fill background
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, width, height);
            
            // Draw border and gradient
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#0d1117');
            gradient.addColorStop(1, '#161b22');
            
            // Draw rounded rectangle
            const radius = 24;
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(width - radius, 0);
            ctx.arcTo(width, 0, width, radius, radius);
            ctx.lineTo(width, height - radius);
            ctx.arcTo(width, height, width - radius, height, radius);
            ctx.lineTo(radius, height);
            ctx.arcTo(0, height, 0, height - radius, radius);
            ctx.lineTo(0, radius);
            ctx.arcTo(0, 0, radius, 0, radius);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#30363d';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Render text
            ctx.fillStyle = '#c9d1d9';
            ctx.font = '14px "JetBrains Mono", monospace';
            
            const text = element.textContent || '';
            const lines = text.split('\n');
            let y = 80;
            
            for (const line of lines) {
              if (y > height - 30) break;
              ctx.fillText(line.substring(0, 110), 80, y);
              y += 20;
            }
            
            console.log('Canvas rendered with fallback method');
            canvas.toBlob((blob) => {
              if (blob) {
                console.log('Fallback blob created, size:', blob.size);
                downloadBlob(blob, problemTitle);
              } else {
                console.error('Fallback blob creation failed');
                showNotification('❌ Failed to create image', 'error');
              }
            }, 'image/png', 1.0);
          } catch (error) {
            console.error('Fallback rendering error:', error);
            showNotification('❌ ' + error.message, 'error');
          }
        }
      }
      
    } catch (error) {
      console.error('Download error:', error);
      showNotification('❌ ' + (error.message || 'Download failed'), 'error');
    }
  }
  
  // Load html2canvas from CDN
  function loadHtml2CanvasFromCDN() {
    return new Promise((resolve) => {
      if (typeof html2canvas !== 'undefined') {
        console.log('html2canvas already loaded');
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.async = true;
      
      script.onload = () => {
        console.log('html2canvas loaded from CDN');
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('Failed to load html2canvas from CDN');
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
  }
  
  // Download blob as file
  function downloadBlob(blob, problemTitle) {
    try {
      console.log('Blob created, size:', blob.size);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = (problemTitle || 'code_screenshot')
        .replace(/[^a-z0-9_-]/gi, '_')
        .substring(0, 50);
      
      link.download = `${safeTitle}_leetstreak.png`;
      link.href = url;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      console.log('Triggering download: ' + link.download);
      
      // Trigger download
      link.click();
      
      // Cleanup
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
      
      showNotification('✅ Screenshot downloaded!', 'success');
    } catch (error) {
      console.error('Download blob error:', error);
      showNotification('❌ ' + error.message, 'error');
    }
  }
  
  // Download canvas as image
  
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
    if (!lang || typeof lang !== 'string') return 'python3';
    
    const lowercaseLang = lang.toLowerCase().trim();
    
    const map = {
      // Python
      'python': 'python3', 'py': 'python3', 'python3': 'python3',
      // JavaScript
      'javascript': 'javascript', 'js': 'javascript', 'ecmascript': 'javascript',
      // TypeScript
      'typescript': 'typescript', 'ts': 'typescript',
      // Java
      'java': 'java',
      // C++
      'c++': 'cpp', 'cpp': 'cpp', 'c++17': 'cpp', 'c++20': 'cpp',
      // C
      'c': 'c',
      // C#
      'csharp': 'csharp', 'c#': 'csharp', 'cs': 'csharp',
      // Go
      'go': 'go',
      // Rust
      'rust': 'rust',
      // PHP
      'php': 'php',
      // Swift
      'swift': 'swift',
      // Kotlin
      'kotlin': 'kotlin', 'kt': 'kotlin',
      // Ruby
      'ruby': 'ruby', 'rb': 'ruby',
      // R
      'r': 'r',
      // Scala
      'scala': 'scala',
      // Bash
      'bash': 'bash', 'shell': 'bash',
      // SQL
      'sql': 'sql'
    };
    
    return map[lowercaseLang] || lowercaseLang;
  }

  function getDisplayLanguageName(lang) {
    const displayMap = {
      'python3': 'Python',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'csharp': 'C#',
      'go': 'Go',
      'rust': 'Rust',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'php': 'PHP',
      'ruby': 'Ruby',
      'r': 'R',
      'scala': 'Scala',
      'bash': 'Bash',
      'sql': 'SQL'
    };
    return displayMap[lang.toLowerCase()] || (lang.charAt(0).toUpperCase() + lang.slice(1));
  }

  // Analyze code to detect language from syntax patterns
  function analyzeCodeLanguage(code) {
    if (!code || typeof code !== 'string') return null;
    
    const patterns = {
      'java': [
        /\bpublic\s+class\s+\w+/,
        /\bpublic\s+static\s+void\s+main/,
        /\bimport\s+java\./,
        /\bnew\s+\w+\s*\(/
      ],
      'cpp': [
        /#include\s*[<"]/,
        /\busing\s+namespace\s+std/,
        /std::/,
        /\bvector<|map<|unordered_map</
      ],
      'c': [
        /#include\s*["<](stdio|stdlib|string)[.>h"]/,
        /printf\s*\(/,
        /scanf\s*\(/,
        /\bmalloc\s*\(/
      ],
      'python': [
        /\bdef\s+\w+\s*\(/,
        /\bclass\s+\w+\s*:/,
        /\bif\s+__name__\s*==\s*['"]__main__['"]/,
        /\bimport\s+\w+|from\s+\w+\s+import/
      ],
      'javascript': [
        /\bfunction\s+\w+\s*\(|const\s+\w+\s*=\s*\(|let\s+\w+\s*=|var\s+\w+\s*=/,
        /\bconst\s+.*=.*=>|function\s*\(/,
        /console\.(log|error|warn)/,
        /\brequire\s*\(|import\s+.*from/
      ],
      'typescript': [
        /:\s*(string|number|boolean|any|void|interface|type|enum)/,
        /\binterface\s+\w+|type\s+\w+\s*=/,
        /public\s+\w+\s*:/,
        /\b<\w+>/
      ],
      'go': [
        /\bpackage\s+main/,
        /\bfunc\s+\w+\s*\(/,
        /\bimport\s*\(/,
        /\berr\s+!=\s+nil/
      ],
      'rust': [
        /\bfn\s+\w+\s*\(/,
        /\bmut\s+\w+/,
        /\b&str|String::|Vec::/,
        /\blet\s+mut\s+\w+/
      ],
      'csharp': [
        /\busing\s+System/,
        /\bpublic\s+(class|interface|struct|enum)/,
        /\bnamespace\s+\w+/,
        /\bvar\s+\w+\s*=/
      ],
      'php': [
        /<\?php|<\?/,
        /\$\w+\s*=/,
        /\bfunction\s+\w+\s*\(/,
        /echo\s+|print\s+/
      ]
    };
    
    let bestMatch = { lang: null, score: 0 };
    
    for (const [lang, patternList] of Object.entries(patterns)) {
      let score = 0;
      for (const pattern of patternList) {
        const matches = code.match(pattern);
        if (matches) {
          score += matches.length;
        }
      }
      
      if (score > bestMatch.score) {
        bestMatch = { lang, score };
      }
    }
    
    return bestMatch.score > 0 ? bestMatch.lang : null;
  }

  function getLanguageExtension(lang) {
    const map = {
      'python3': 'py', 'javascript': 'js', 'typescript': 'ts',
      'java': 'java', 'cpp': 'cpp', 'c': 'c', 'csharp': 'cs',
      'go': 'go', 'rust': 'rs', 'swift': 'swift', 'kotlin': 'kt',
      'php': 'php', 'ruby': 'rb', 'r': 'r', 'scala': 'scala',
      'bash': 'sh', 'sql': 'sql'
    };
    return map[lang] || 'txt';
  }
  
  /**
   * Initialize GitHub sync and set up submission monitoring
   */
  async function initGitHubSync() {
    try {
      const result = await safeStorageGet(['github_sync_enabled', 'github_username', 'github_repo', 'github_token_encrypted']);
      
      console.log('📊 GitHub sync storage check:', {
        enabled: result.github_sync_enabled,
        hasEncryptedToken: !!result.github_token_encrypted,
        username: result.github_username,
        repo: result.github_repo
      });
      
      // Check if github_sync_enabled is true AND we have encrypted token stored
      if (result.github_sync_enabled && result.github_token_encrypted) {
        githubSyncEnabled = true;
        console.log('✅ LeetStreak: GitHub sync is ENABLED');
        
        // Monitor for submit button clicks
        setupSubmitButtonListener();
      } else {
        console.log('❌ LeetStreak: GitHub sync is DISABLED');
        if (!result.github_sync_enabled) {
          console.log('  - Reason: github_sync_enabled flag not set');
        }
        if (!result.github_token_encrypted) {
          console.log('  - Reason: github_token_encrypted not found in storage');
        }
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

    submissionWatcher = new MutationObserver(async (mutations) => {

      // Check for timeout
      if (Date.now() - startTime > timeout) {
        console.log('⏱️ LeetStreak: Submission watch timeout');
        submissionWatcher.disconnect();
        await markSubmissionExpired(submissionId);
        return;
      }

      // Check for "Accepted" status
      if (isSubmissionAccepted()) {
        console.log('✅ LeetStreak: Submission ACCEPTED! Extracting stats...');
        submissionWatcher.disconnect();
        showNotification('✅ Accepted! Extracting stats...', 'success');
        
        // Wait a moment for stats to fully render
        await new Promise(r => setTimeout(r, 1500));
        
        // Extract runtime and memory stats
        const performanceStats = extractPerformanceStats();
        console.log('📊 Performance stats:', performanceStats);
        
        // Merge performance stats with submission
        const enrichedSubmission = {
          ...submission,
          ...performanceStats
        };
        
        showNotification('✅ Syncing to GitHub...', 'success');
        
        // Send to background worker for GitHub sync
        await triggerGitHubSync(submissionId, enrichedSubmission);
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
   * Extract runtime and memory performance stats from the result page
   * Called after submission is accepted
   */
  function extractPerformanceStats() {
    const stats = {
      runtime: null,
      runtimePercentile: null,
      memory: null,
      memoryPercentile: null,
      acceptanceRate: null
    };

    try {
      // Strategy 1: Look for result details in the submission result area
      const resultArea = document.querySelector('[data-e2e-locator="submission-result"]') || 
                        document.querySelector('[class*="result"]');
      
      if (resultArea) {
        const text = resultArea.textContent;
        
        // Extract runtime (e.g., "Runtime: 52 ms" or "52 ms")
        const runtimeMatch = text.match(/(?:Runtime[:\s]*)?(\d+)\s*ms/i);
        if (runtimeMatch) {
          stats.runtime = `${runtimeMatch[1]} ms`;
        }
        
        // Extract runtime percentile (e.g., "Beats 89.5%" or "faster than 89.5%")
        const runtimePercentMatch = text.match(/(?:Beats|faster than)\s*([\d.]+)\s*%/i);
        if (runtimePercentMatch) {
          stats.runtimePercentile = parseFloat(runtimePercentMatch[1]).toFixed(1);
        }
        
        // Extract memory (e.g., "Memory: 17.2 MB" or "17.2 MB")
        const memoryMatch = text.match(/(?:Memory[:\s]*)?([\d.]+)\s*MB/i);
        if (memoryMatch) {
          stats.memory = `${memoryMatch[1]} MB`;
        }
        
        // Extract memory percentile (e.g., "Beats 45.3%" after memory)
        // This is tricky because there might be two "Beats X%" - one for runtime, one for memory
        const allBeatsMatches = text.matchAll(/(?:Beats|less than)\s*([\d.]+)\s*%/gi);
        const beatsValues = [...allBeatsMatches].map(m => parseFloat(m[1]));
        if (beatsValues.length >= 2) {
          // First is runtime, second is memory
          stats.runtimePercentile = beatsValues[0].toFixed(1);
          stats.memoryPercentile = beatsValues[1].toFixed(1);
        } else if (beatsValues.length === 1 && !stats.runtimePercentile) {
          stats.runtimePercentile = beatsValues[0].toFixed(1);
        }
      }

      // Strategy 2: Look for specific elements with stats
      const statElements = document.querySelectorAll('[class*="flex"][class*="items-center"]');
      statElements.forEach(elem => {
        const text = elem.textContent;
        
        // Check for runtime info
        if (text.includes('ms') && !stats.runtime) {
          const match = text.match(/(\d+)\s*ms/);
          if (match) stats.runtime = `${match[1]} ms`;
        }
        
        // Check for memory info
        if (text.includes('MB') && !stats.memory) {
          const match = text.match(/([\d.]+)\s*MB/);
          if (match) stats.memory = `${match[1]} MB`;
        }
      });

      // Strategy 3: Look for percentile bars/charts
      const percentileElements = document.querySelectorAll('[class*="percent"], [class*="beats"]');
      percentileElements.forEach(elem => {
        const text = elem.textContent;
        const match = text.match(/([\d.]+)\s*%/);
        if (match) {
          const value = parseFloat(match[1]).toFixed(1);
          // Try to determine if it's runtime or memory based on context
          const parent = elem.closest('[class*="runtime"], [class*="memory"]');
          if (parent) {
            if (parent.className.includes('runtime') && !stats.runtimePercentile) {
              stats.runtimePercentile = value;
            } else if (parent.className.includes('memory') && !stats.memoryPercentile) {
              stats.memoryPercentile = value;
            }
          }
        }
      });

      // Strategy 4: Extract from GraphQL data in page
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        const content = script.textContent;
        
        // Look for submission details in JSON
        if (content.includes('statusRuntime') || content.includes('runtimePercentile')) {
          try {
            // Try to extract runtime
            const runtimeMatch = content.match(/"statusRuntime"\s*:\s*"?(\d+)\s*ms"?/);
            if (runtimeMatch && !stats.runtime) {
              stats.runtime = `${runtimeMatch[1]} ms`;
            }
            
            // Try to extract runtime percentile
            const runtimePctMatch = content.match(/"runtimePercentile"\s*:\s*([\d.]+)/);
            if (runtimePctMatch && !stats.runtimePercentile) {
              stats.runtimePercentile = parseFloat(runtimePctMatch[1]).toFixed(1);
            }
            
            // Try to extract memory
            const memoryMatch = content.match(/"statusMemory"\s*:\s*"?([\d.]+)\s*MB"?/);
            if (memoryMatch && !stats.memory) {
              stats.memory = `${memoryMatch[1]} MB`;
            }
            
            // Try to extract memory percentile
            const memoryPctMatch = content.match(/"memoryPercentile"\s*:\s*([\d.]+)/);
            if (memoryPctMatch && !stats.memoryPercentile) {
              stats.memoryPercentile = parseFloat(memoryPctMatch[1]).toFixed(1);
            }
          } catch (e) {
            // Continue
          }
        }
      });

      // Strategy 5: Extract acceptance rate from problem info
      try {
        const acceptanceElement = document.querySelector('[class*="acceptance"], [class*="Acceptance"]');
        if (acceptanceElement) {
          const match = acceptanceElement.textContent.match(/([\d.]+)\s*%/);
          if (match) {
            stats.acceptanceRate = parseFloat(match[1]).toFixed(1);
          }
        }
        
        // Also try from the problem description area
        if (!stats.acceptanceRate) {
          const allText = document.body.textContent;
          const acceptMatch = allText.match(/Acceptance Rate\s*:?\s*([\d.]+)\s*%/i);
          if (acceptMatch) {
            stats.acceptanceRate = parseFloat(acceptMatch[1]).toFixed(1);
          }
        }
      } catch (e) {
        // Continue
      }

      console.log('📊 Extracted performance stats:', stats);
      return stats;

    } catch (error) {
      console.error('Error extracting performance stats:', error);
      return stats;
    }
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
      console.log('🐙 LeetStreak: GitHub Auto-Sync triggered');
      console.log('📤 Sending GitHub sync message to background with:', {
        submissionId,
        problemTitle: submission.problemTitle,
        language: submission.language,
        codeLength: submission.code?.length || 0
      });
      
      // Validate input
      if (!submissionId) {
        throw new Error('submissionId is required');
      }
      if (!submission) {
        throw new Error('submission object is required');
      }
      console.log('✅ Submission data validated');
      
      // First, ping the service worker to ensure it's awake
      console.log('🏓 Pinging service worker to keep it awake...');
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Service worker ping timeout'));
          }, 2000);
          
          console.log('Calling chrome.runtime.sendMessage with PING...');
          chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
            console.log('PING response received:', response);
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              console.error('PING error:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
        console.log('✅ Service worker is awake');
      } catch (pingError) {
        console.warn('⚠️ Service worker ping failed, proceeding anyway:', pingError.message);
      }
      
      // Send with retry logic in case service worker isn't ready
      let retries = 0;
      const maxRetries = 3;
      
      const sendMessage = () => {
        console.log('🚀 LeetStreak: About to send GITHUB_SYNC_SUBMISSION message...');
        console.log('📋 submissionId:', submissionId);
        console.log('📋 submission object:', submission);
        
        chrome.runtime.sendMessage({
          type: 'GITHUB_SYNC_SUBMISSION',
          submissionId,
          submission
        }, (response) => {
          console.log('📬 LeetStreak: Message callback received, response:', response);
          if (chrome.runtime.lastError) {
            console.error('❌ LeetStreak: Message delivery error:', chrome.runtime.lastError.message);
            
            if (retries < maxRetries) {
              console.log(`⏳ Retry ${retries + 1}/${maxRetries}...`);
              retries++;
              setTimeout(sendMessage, 1000); // Retry after 1 second
            } else {
              showNotification('❌ Sync failed: Extension error', 'error');
            }
            return;
          }
          
          if (response && response.success) {
            console.log('✅ LeetStreak: GitHub auto-sync response received - SUCCESS');
            showNotification('✅ Synced to GitHub!', 'success');
          } else {
            console.error('❌ LeetStreak: GitHub auto-sync response - FAILURE:', response?.error);
            showNotification('⚠️ Auto-sync failed. Stored as pending.', 'info');
          }
        });
      };
      
      console.log('About to call sendMessage function');
      sendMessage();
      console.log('sendMessage function called');
    } catch (error) {
      console.error('❌ LeetStreak: Critical error in triggerGitHubSync:', error);
      console.error('Error stack:', error.stack);
      showNotification('❌ Sync error: ' + error.message, 'error');
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
