/**
 * Code Capture Module for LeetCode
 * Multi-strategy code extraction from Monaco editor with fallbacks
 */

class CodeCaptureManager {
  constructor() {
    this.captureStrategies = [
      this.captureFromMonacoAPI.bind(this),
      this.captureFromTextarea.bind(this),
      this.captureFromCodeMirror.bind(this),
      this.captureFromVisibleLines.bind(this)
    ];
  }

  /**
   * Main capture function - tries all strategies
   */
  async captureCode(maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      for (const strategy of this.captureStrategies) {
        try {
          const code = await strategy();
          if (code && code.trim().length > 0) {
            return {
              success: true,
              code: code.trim(),
              method: strategy.name,
              attempt: attempt + 1
            };
          }
        } catch (error) {
          console.warn(`Capture strategy ${strategy.name} failed:`, error);
        }
      }

      // Wait 200ms before retry
      if (attempt < maxAttempts - 1) {
        await this.delay(200);
      }
    }

    return {
      success: false,
      code: null,
      error: 'All capture strategies failed',
      requiresManual: true
    };
  }

  /**
   * Strategy 1: Monaco Editor API
   * LeetCode uses Monaco editor (VS Code's editor)
   */
  async captureFromMonacoAPI() {
    // Check if Monaco is available
    if (typeof window.monaco === 'undefined' || !window.monaco.editor) {
      throw new Error('Monaco editor not available');
    }

    const models = window.monaco.editor.getModels();
    if (!models || models.length === 0) {
      throw new Error('No Monaco models found');
    }

    // Find the solution editor model (not test case editor)
    const solutionModel = models.find(model => {
      const uri = model.uri.toString();
      // Solution models typically don't have 'test' in their URI
      return !uri.includes('test') && !uri.includes('input');
    }) || models[0]; // Fallback to first model

    if (!solutionModel) {
      throw new Error('No solution model found');
    }

    const code = solutionModel.getValue();
    
    if (!code || code.trim().length === 0) {
      throw new Error('Monaco model is empty');
    }

    return code;
  }

  /**
   * Strategy 2: Textarea fallback
   * Some views might use textarea
   */
  async captureFromTextarea() {
    const textareas = [
      document.querySelector('.monaco-editor textarea'),
      document.querySelector('[data-mode-id] textarea'),
      document.querySelector('textarea[class*="code"]'),
      document.querySelector('textarea')
    ];

    for (const textarea of textareas) {
      if (textarea && textarea.value && textarea.value.trim().length > 0) {
        return textarea.value;
      }
    }

    throw new Error('No textarea with code found');
  }

  /**
   * Strategy 3: CodeMirror fallback (legacy)
   * Older LeetCode versions might use CodeMirror
   */
  async captureFromCodeMirror() {
    const codeMirror = document.querySelector('.CodeMirror');
    if (!codeMirror || !codeMirror.CodeMirror) {
      throw new Error('CodeMirror not found');
    }

    const code = codeMirror.CodeMirror.getValue();
    if (!code || code.trim().length === 0) {
      throw new Error('CodeMirror is empty');
    }

    return code;
  }

  /**
   * Strategy 4: Parse visible lines from DOM
   * Last resort - extract code from rendered lines
   */
  async captureFromVisibleLines() {
    const lineSelectors = [
      '.view-lines .view-line',
      '.monaco-editor .view-line',
      '[class*="view-line"]'
    ];

    for (const selector of lineSelectors) {
      const lines = document.querySelectorAll(selector);
      if (lines.length > 0) {
        const code = Array.from(lines)
          .map(line => line.textContent)
          .join('\n');

        if (code.trim().length > 0) {
          return code;
        }
      }
    }

    throw new Error('No visible code lines found');
  }

  /**
   * Detect programming language from the editor
   */
  detectLanguage() {
    // Strategy 1: Monaco model language
    try {
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models.length > 0) {
          const language = models[0].getLanguageId();
          if (language) {
            return this.normalizeLanguage(language);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to detect language from Monaco:', error);
    }

    // Strategy 2: Language selector dropdown
    const langSelectors = [
      '[data-mode-id]',
      '[class*="lang-select"]',
      'button[id*="lang"]',
      '.ant-select-selection-item' // LeetCode's dropdown
    ];

    for (const selector of langSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const lang = element.getAttribute('data-mode-id') || 
                     element.textContent?.toLowerCase().trim();
        if (lang) {
          return this.normalizeLanguage(lang);
        }
      }
    }

    // Strategy 3: URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam) {
      return this.normalizeLanguage(langParam);
    }

    // Strategy 4: Local storage (LeetCode caches selected language)
    try {
      const globalLang = localStorage.getItem('global_lang');
      if (globalLang) {
        const parsed = JSON.parse(globalLang);
        if (parsed.lang) {
          return this.normalizeLanguage(parsed.lang);
        }
      }
    } catch (error) {
      console.warn('Failed to detect language from localStorage:', error);
    }

    // Strategy 5: Detect from code syntax (basic heuristics)
    // This is unreliable but better than nothing
    return 'python3'; // Safest default
  }

  /**
   * Normalize language names to standard format
   */
  normalizeLanguage(lang) {
    const normalized = lang.toLowerCase().trim();
    
    const languageMap = {
      'python': 'python3',
      'python3': 'python3',
      'py': 'python3',
      'javascript': 'javascript',
      'js': 'javascript',
      'typescript': 'typescript',
      'ts': 'typescript',
      'java': 'java',
      'c++': 'cpp',
      'cpp': 'cpp',
      'cplusplus': 'cpp',
      'c': 'c',
      'c#': 'csharp',
      'csharp': 'csharp',
      'go': 'go',
      'golang': 'go',
      'rust': 'rust',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'ruby': 'ruby',
      'scala': 'scala',
      'php': 'php'
    };

    return languageMap[normalized] || normalized;
  }

  /**
   * Get file extension for language
   */
  getExtension(language) {
    const extensionMap = {
      'python3': 'py',
      'javascript': 'js',
      'typescript': 'ts',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'go': 'go',
      'rust': 'rs',
      'swift': 'swift',
      'kotlin': 'kt',
      'ruby': 'rb',
      'scala': 'scala',
      'php': 'php'
    };

    return extensionMap[language] || 'txt';
  }

  /**
   * Validate captured code (basic checks)
   */
  validateCode(code, language) {
    if (!code || code.trim().length === 0) {
      return { valid: false, reason: 'Code is empty' };
    }

    // Check if code looks like template (LeetCode provides starter code)
    const minCodeLength = 10;
    if (code.trim().length < minCodeLength) {
      return { valid: false, reason: 'Code too short (likely template)' };
    }

    // Language-specific basic validation
    const validationPatterns = {
      'python3': /def |class |import /,
      'javascript': /function |const |let |var |=>/,
      'java': /class |public |private |void /,
      'cpp': /#include |class |int |void /
    };

    const pattern = validationPatterns[language];
    if (pattern && !pattern.test(code)) {
      return { 
        valid: false, 
        reason: `Code doesn't contain expected ${language} patterns` 
      };
    }

    return { valid: true };
  }

  /**
   * Utility: delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all editor information at once
   */
  async captureAll() {
    const code = await this.captureCode();
    const language = this.detectLanguage();
    const extension = this.getExtension(language);
    
    return {
      ...code,
      language,
      extension,
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
const codeCapture = new CodeCaptureManager();
export default codeCapture;

// Also export the class for testing
export { CodeCaptureManager };
