# 🚀 LeetCode Page Integration Features

## New Buttons on LeetCode Problem Pages!

When you visit any LeetCode problem page (e.g., `https://leetcode.com/problems/two-sum/`), you'll now see **two new buttons** near the top-right area:

---

## 📋 **Add to Queue** Button

### What it does:
- **One-click** save problems to solve later
- Automatically extracts problem details (title, difficulty, number, description)
- Stores in your personal queue visible in the extension popup

### How to use:
1. Visit any LeetCode problem page
2. Click the **"📋 Add to Queue"** button
3. Problem is instantly added to your queue
4. View your queue in the **Progress tab** of the extension popup

### Queue Features:
- ✅ **Status tracking**: Pending ⏳ → In Progress 🚀 → Completed ✅
- 📊 **Smart display**: See problem difficulty and number
- 🔗 **Quick open**: Click "Open" to jump to the problem
- 🗑️ **Easy removal**: Remove problems when done
- 📈 **Progress stats**: See counts of pending/in-progress/completed problems

---

## 📸 **Code Screenshot** Button

### What it does:
- Generates a **beautiful, shareable screenshot** of:
  - ✨ Problem title & difficulty badge
  - 💻 Your code with syntax highlighting
  - 🎨 Aesthetic gradient background
  - 📅 Date stamp
  - 🏷️ LeetStreak branding

### How to use:
1. Write your solution in the LeetCode editor
2. Click the **"📸 Code Screenshot"** button
3. Preview opens in a modal
4. Choose to:
   - **📋 Copy as Image** - Copy to clipboard
   - **💾 Download PNG** - Save to your computer
   - **Right-click** - Manual save from preview

### Screenshot Features:
- 🎨 **Beautiful design** with gradient backgrounds
- 🏷️ **Difficulty badges** (Easy/Medium/Hard) with proper colors
- 💻 **Code formatting** preserved with monospace font
- 📱 **Shareable** - Perfect for LinkedIn, Twitter, Discord
- 🖼️ **High resolution** - 2x scale for crisp images

### Perfect for:
- 📱 Sharing solutions on social media
- 📝 Building your portfolio
- 👥 Helping friends understand your approach
- 🎓 Creating study materials
- 💼 Interview preparation documentation

---

## 🎯 Viewing Your Queue in the Extension

### In the **Progress Tab**:

1. **Open** the LeetStreak extension popup
2. **Click** on the "🔥 Progress" tab
3. **Scroll** to the "📝 Problem Queue" section

### Queue Actions:
- **▶ Start** - Mark problem as in-progress
- **✓ Complete** - Mark problem as completed
- **Open** - Jump directly to the problem on LeetCode
- **✕ Remove** - Delete from queue

### Queue Statistics:
- Total problems in queue
- ⏳ Pending count
- 🚀 In-progress count
- ✅ Completed count

---

## 🔧 Technical Details

### Button Injection:
- Buttons appear after ~2 seconds on problem pages
- Uses MutationObserver for dynamic content
- Styled to match LeetCode's design
- Hover effects and animations

### Data Storage:
```javascript
problem_queue: [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    number: "1",
    url: "https://leetcode.com/problems/two-sum/",
    addedAt: 1703462400000,
    status: "pending" // pending | in-progress | completed
  }
]
```

### Screenshot Technology:
- Uses **html2canvas** library for rendering
- Generates PNG images at 2x resolution
- Inline CSS styling for pixel-perfect design
- Clipboard API for copy functionality

---

## 🎨 Button Styles

Both buttons feature:
- 🌈 Purple gradient background
- ✨ Smooth hover animations
- 📦 Modern rounded corners
- 🔆 Subtle shadow effects
- 💫 Clean, professional design

---

## 🆘 Troubleshooting

### Buttons not appearing?
1. **Refresh** the page
2. **Wait 2-3 seconds** for injection
3. **Check** you're on a problem page (not `/problemset/`)
4. **Verify** extension is enabled in Chrome

### Screenshot not working?
1. Ensure you've **written code** in the editor
2. Try the **Download** option if Copy fails
3. **Right-click** on preview to save manually
4. Check that html2canvas library loaded (console)

### Queue not showing?
1. **Open** the extension popup
2. **Click** the "🔥 Progress" tab
3. **Scroll down** to Problem Queue section
4. Try **refreshing** the extension

---

## 📝 Example Use Cases

### For Learners:
1. Browse LeetCode, add interesting problems to queue
2. Work through queue systematically
3. Mark progress as you go
4. Share solutions with study group

### For Job Seekers:
1. Create queue of interview prep problems
2. Track completion before interviews
3. Generate screenshots for portfolio
4. Share solutions on LinkedIn

### For Educators:
1. Curate problem sets for students
2. Share beautiful code screenshots in presentations
3. Track which problems to review
4. Create study guides

---

## 🎉 Coming Soon

Future enhancements planned:
- 📊 Queue analytics and insights
- 🏷️ Tags and categories for queued problems
- 📅 Schedule reminders for queued problems
- 🤝 Share queue with friends
- 📈 Track time spent on each problem
- 🎯 Smart problem recommendations

---

## 💡 Tips

1. **Add problems while browsing** - Don't worry about forgetting interesting problems
2. **Use status markers** - Track your actual progress through problems
3. **Screenshot before Submit** - Capture your best attempts
4. **Customize screenshots** - Edit title/code before generating
5. **Build your collection** - Create a library of solved problems

---

## 🔗 Quick Links

- **Extension Popup**: Click the LeetStreak icon in Chrome toolbar
- **Progress Tab**: First tab in the popup (🔥 Progress)
- **Problem Queue**: Scroll down in Progress tab
- **LeetCode**: Visit any problem page to see buttons

---

**Enjoy coding! 🚀**

*Built with ❤️ by LeetStreak Team*
