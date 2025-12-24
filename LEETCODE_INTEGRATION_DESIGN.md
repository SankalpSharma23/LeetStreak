# LeetCode Page Integration - Design Document

## Overview
Add two buttons to LeetCode problem pages (near "Ask Leet" button):
1. **Private Notes Button** - Save personal notes on problems
2. **Share with Friends Button** - Share solutions/approaches with your LeetCode friends

## Technical Architecture

### 1. Content Script
**File**: `src/content/leetcode-page-integration.js`

This script will:
- Inject buttons into the LeetCode problem page
- Detect when user is on a problem page
- Extract problem information (title, difficulty, URL, slug)
- Handle button clicks and open modals

### 2. Storage Structure

```javascript
// Notes Storage
{
  "problem_notes": {
    "two-sum": {
      "problemTitle": "Two Sum",
      "problemSlug": "two-sum",
      "difficulty": "Easy",
      "url": "https://leetcode.com/problems/two-sum/",
      "notes": [
        {
          "id": "note_123",
          "content": "Remember to use HashMap for O(n) solution",
          "timestamp": 1703462400000,
          "tags": ["review", "important"],
          "reminder": "2024-01-01" // Optional reminder date
        }
      ],
      "lastUpdated": 1703462400000
    }
  }
}

// Shared Solutions Storage
{
  "shared_solutions": {
    "share_123": {
      "problemTitle": "Two Sum",
      "problemSlug": "two-sum",
      "sharedBy": "myusername",
      "sharedWith": ["friend1", "friend2"], // Array of usernames
      "content": {
        "approach": "HashMap approach for O(n) time",
        "code": "class Solution {...}",
        "language": "Python",
        "complexity": {
          "time": "O(n)",
          "space": "O(n)"
        },
        "notes": "This is cleaner than the brute force"
      },
      "timestamp": 1703462400000
    }
  }
}
```

### 3. UI Components

#### Private Notes Modal
**File**: `src/content/NotesModal.jsx` (injected via content script)

Features:
- Rich text editor for notes
- Tag system (review, important, tricky, optimal, etc.)
- Reminder date picker
- Previous notes history for this problem
- Search through all notes
- Export notes as markdown

UI Layout:
```
┌─────────────────────────────────────────┐
│ 📝 Private Notes - Two Sum              │
├─────────────────────────────────────────┤
│                                         │
│  [Textarea for notes]                   │
│                                         │
│  Tags: [review] [important] [+Add]      │
│  Reminder: [Date Picker] (Optional)     │
│                                         │
│  Previous Notes (2):                    │
│  ┌───────────────────────────────────┐  │
│  │ Dec 20, 2024                      │  │
│  │ Remember to use HashMap...  [Edit]│  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Cancel]  [Save Note]                  │
└─────────────────────────────────────────┘
```

#### Share Solution Modal
**File**: `src/content/ShareModal.jsx`

Features:
- Select friends from your friend list
- Add approach description
- Include code snippet (optional)
- Add time/space complexity
- Add personal notes/tips
- View shared solutions from friends

UI Layout:
```
┌─────────────────────────────────────────┐
│ 🚀 Share Solution - Two Sum             │
├─────────────────────────────────────────┤
│                                         │
│ Share with:                             │
│ [x] friend1 (John)  [ ] friend2 (Jane)  │
│ [x] friend3 (Mike)  [ ] friend4 (Sara)  │
│                                         │
│ Your Approach:                          │
│ [Textarea: HashMap approach...]         │
│                                         │
│ Code (Optional):                        │
│ [Code Editor with language selector]    │
│                                         │
│ Complexity:                             │
│ Time: [O(n)] Space: [O(n)]             │
│                                         │
│ Additional Notes:                       │
│ [Textarea]                              │
│                                         │
│ [Cancel]  [Share Solution]              │
└─────────────────────────────────────────┘
```

### 4. Button Injection Strategy

The buttons should be injected near the "Ask Leet" button. Typical LeetCode problem page structure:

```javascript
// Target: Find the action buttons area
const targetSelector = '.flex.items-center.gap-2'; // Near Ask Leet button
// Or more specific: 'div[class*="action"]' or near submission buttons
```

Button Design:
```html
<!-- Private Notes Button -->
<button class="leet-streak-note-btn">
  <svg>📝</svg>
  <span>My Notes</span>
  <span class="badge">3</span> <!-- Show note count -->
</button>

<!-- Share Button -->
<button class="leet-streak-share-btn">
  <svg>🚀</svg>
  <span>Share</span>
</button>
```

### 5. Manifest Updates Required

```json
{
  "content_scripts": [
    {
      "matches": ["https://leetcode.com/problems/*"],
      "js": ["content-script.js"],
      "css": ["content-styles.css"],
      "run_at": "document_end"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["https://leetcode.com/*"]
    }
  ]
}
```

### 6. Features Breakdown

#### Private Notes Features:
✅ **Core Features**
- Save unlimited notes per problem
- Edit/delete notes
- Timestamp tracking
- Tag system (customizable)
- Search across all notes
- Filter by tags
- Export as markdown/JSON

🌟 **Advanced Features**
- Reminder system (notify on date)
- Rich text formatting (bold, italic, code blocks)
- Attach images/screenshots
- Voice notes recording
- Link to specific line numbers in code
- Sync notes across devices (future)

#### Share Solution Features:
✅ **Core Features**
- Share with selected friends
- Include approach description
- Optional code snippet
- Time/space complexity
- View received solutions from friends
- Delete/edit shared solutions

🌟 **Advanced Features**
- Comment on shared solutions
- Like/react to solutions
- Solution comparison view
- Share only after solving (toggle)
- Anonymous sharing option
- Generate shareable link
- Export solution as PDF

### 7. Implementation Priority

**Phase 1** (MVP - Quick Win):
1. ✅ Inject buttons on problem pages
2. ✅ Private notes modal with basic text editor
3. ✅ Save/load notes from chrome.storage
4. ✅ Display note count badge
5. ✅ Share modal with friend selection
6. ✅ Basic sharing functionality

**Phase 2** (Enhanced):
1. Tag system for notes
2. Reminder notifications
3. Search and filter notes
4. View shared solutions tab
5. Rich text editor
6. Code syntax highlighting

**Phase 3** (Advanced):
1. Solution comparison view
2. Comments on shared solutions
3. Export features
4. Voice notes
5. Image attachments

### 8. Key Technical Challenges

#### Challenge 1: Button Injection
- **Problem**: LeetCode uses dynamic rendering (React)
- **Solution**: Use MutationObserver to detect DOM changes
- **Implementation**:
```javascript
const observer = new MutationObserver(() => {
  if (isOnProblemPage() && !buttonsInjected) {
    injectButtons();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

#### Challenge 2: Modal Rendering
- **Problem**: Need to render React components in content script
- **Solution**: Use Shadow DOM or create React root in content script
- **Implementation**:
```javascript
import { createRoot } from 'react-dom/client';

const container = document.createElement('div');
container.id = 'leetstreak-modal-root';
document.body.appendChild(container);
const root = createRoot(container);
root.render(<NotesModal />);
```

#### Challenge 3: Styling Conflicts
- **Problem**: LeetCode's Tailwind CSS might conflict
- **Solution**: Use Shadow DOM or CSS modules with unique prefixes
- **Implementation**:
```javascript
const shadowRoot = container.attachShadow({ mode: 'open' });
// Render components inside shadowRoot
```

#### Challenge 4: Data Sync
- **Problem**: Sharing data between users
- **Solution**: Use Chrome storage + future cloud sync
- **Current**: Local storage only (each user stores shared items)
- **Future**: Backend API for real-time sharing

### 9. User Flow Diagrams

#### Private Notes Flow:
```
User on Problem Page
    ↓
Click "My Notes" button
    ↓
Modal opens with:
  - Existing notes (if any)
  - New note editor
    ↓
User writes/edits note
    ↓
[Optional] Add tags, reminder
    ↓
Click "Save Note"
    ↓
Note saved to chrome.storage
    ↓
Badge updates with note count
    ↓
Modal closes
```

#### Share Solution Flow:
```
User on Problem Page
    ↓
Click "Share" button
    ↓
Modal opens with friend list
    ↓
Select friends to share with
    ↓
Write approach description
    ↓
[Optional] Add code, complexity
    ↓
Click "Share Solution"
    ↓
Solution saved to storage
    ↓
[Future] Notification sent to friends
    ↓
Modal closes
```

### 10. API/Storage Methods

```javascript
// Notes API
async function saveNote(problemSlug, noteContent, tags, reminder)
async function getNotes(problemSlug)
async function getAllNotes()
async function updateNote(problemSlug, noteId, newContent)
async function deleteNote(problemSlug, noteId)
async function searchNotes(query)

// Sharing API
async function shareSolution(problemSlug, friendUsernames, solutionData)
async function getSharedSolutions(problemSlug)
async function getReceivedSolutions(problemSlug)
async function deleteSharedSolution(shareId)
async function updateSharedSolution(shareId, newData)
```

### 11. Security Considerations

1. **Input Sanitization**: Sanitize all user input to prevent XSS
2. **Storage Limits**: Monitor chrome.storage.local quota (5MB)
3. **Friend Validation**: Verify friend exists before sharing
4. **Privacy**: Notes are private by default, sharing is explicit
5. **Code Injection**: Use textContent instead of innerHTML

### 12. Performance Optimization

1. **Lazy Loading**: Load modals only when clicked
2. **Debounce**: Debounce autosave in note editor
3. **Caching**: Cache problem data to avoid re-fetching
4. **Batch Operations**: Batch storage writes
5. **Virtual Scrolling**: For long note lists

### 13. Testing Strategy

- **Unit Tests**: Test note CRUD operations
- **Integration Tests**: Test button injection
- **E2E Tests**: Test full user flows
- **Manual Tests**: Test on different LeetCode pages

### 14. Future Enhancements

1. **Mobile Support**: Browser extension for mobile
2. **Cloud Sync**: Sync notes across devices
3. **AI Assistance**: AI-powered solution hints
4. **Video Explanations**: Attach video explanations
5. **Study Groups**: Create study groups with shared notes
6. **Progress Tracking**: Track which problems reviewed
7. **Spaced Repetition**: Smart reminders based on forgetting curve
8. **Collaborative Notes**: Real-time collaborative editing

---

## Quick Start Implementation Guide

### Step 1: Create Content Script
```javascript
// src/content/leetcode-integration.js
(function() {
  console.log('LeetStreak: Content script loaded');
  
  function isProblemPage() {
    return window.location.pathname.startsWith('/problems/');
  }
  
  function injectButtons() {
    // Find injection point
    // Create buttons
    // Add event listeners
  }
  
  if (isProblemPage()) {
    injectButtons();
  }
})();
```

### Step 2: Update Manifest
Add content_scripts configuration

### Step 3: Create Modal Components
Build React components for notes and sharing

### Step 4: Style Integration
Create CSS that matches LeetCode's design

### Step 5: Storage Layer
Implement storage functions for notes and shares

### Step 6: Testing
Test on various LeetCode problem pages

---

## Conclusion

This design provides a comprehensive roadmap for implementing private notes and sharing features on LeetCode problem pages. The phased approach allows for iterative development, starting with core functionality and gradually adding advanced features.

**Estimated Development Time:**
- Phase 1 (MVP): 2-3 days
- Phase 2 (Enhanced): 3-4 days  
- Phase 3 (Advanced): 5-7 days

**Total**: ~10-14 days for full implementation
