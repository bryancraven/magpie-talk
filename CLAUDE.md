# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Magpie Talk** is a browser-based speech practice tool for prolonged speech technique (fluency-shaping therapy for stuttering). It loads Wikipedia articles and highlights syllables one at a time at a user-controlled pace.

**Key Context:**
- Purely client-side: No build process, backend, or package manager
- Vanilla JavaScript/HTML/CSS (no frameworks)
- All external dependencies loaded from CDN
- Designed to load immediately with auto-loading featured article on page open

## Architecture

The application uses a **modular class-based architecture** with clear separation of concerns:

### Core Classes (in `app.js`)

1. **WikipediaService** (lines 5-72)
   - Static methods for fetching articles from Wikipedia API
   - `getFeaturedArticle(year, month, day)` - Fetches featured article for a specific date
   - `getArticleByTitle(title)` - Fetches full article text by title
   - Handles Wikipedia API response parsing and error cases
   - **Important:** Uses `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/` for featured articles and `https://en.wikipedia.org/w/api.php` for custom searches

2. **SyllableParser** (lines 78-189)
   - Splits text into syllables using Hypher library (loaded from CDN)
   - Fallback regex-based parsing if Hypher unavailable
   - `parse(text)` - Main method that returns `{ syllables: [], wordMap: [] }`
   - Handles special cases: acronyms, numbers, punctuation preservation
   - Uses word mapping to track which syllables belong to which words (preserves layout)

3. **PacingEngine** (lines 195-293)
   - Manages the highlighting sequence and timing
   - `start()`, `pause()`, `resume()`, `stop()`, `reset()` - Controls playback
   - `setSpeed(speed)` - Adjusts milliseconds per syllable (500-2000ms)
   - Tracks elapsed time and progress percentage
   - Callbacks: `onSyllableChange(index, syllable)` and `onComplete()`

4. **ThemeManager** (lines 299-329)
   - Handles light/dark mode toggle
   - Uses `data-theme` attribute on `<html>` element
   - Persists theme preference to localStorage
   - Respects system `prefers-color-scheme` on first load

5. **UIController** (lines 335-695)
   - Orchestrates all components and manages user interactions
   - `loadFeaturedArticleOnInit()` - Auto-loads featured article immediately on page load
   - `loadArticleByTitle(input)` - **Has URL parsing regex** (line 459) to extract article titles from full Wikipedia URLs
   - `displayArticle(article)` - Renders article with syllable highlighting spans
   - **Performance optimization:** Caches syllable elements in `this.syllableCache` array for fast DOM access during highlighting

### Data Flow

1. Page loads → `DOMContentLoaded` → `UIController` constructor
2. UIController calls `loadFeaturedArticleOnInit()` (immediate, no setTimeout)
3. Featured article loads → WikipediaService.getFeaturedArticle()
4. Text parsed into syllables → SyllableParser
5. Syllables rendered as spans in DOM with cache
6. User clicks "Start" → PacingEngine begins highlighting cached syllable elements
7. User loads custom article → URL parsing handles both URLs and plain titles

## Key Implementation Details

### Article Loading & URL Parsing
- **Line 449-476:** `loadArticleByTitle(input)` accepts both:
  - Plain titles: `"Albert Einstein"`
  - Full URLs: `"https://en.wikipedia.org/wiki/Albert_Einstein"`
  - Regex on line 459: `/(?:https?:\/\/)?(?:[\w]+\.)?wikipedia\.org\/wiki\/([^#?]+)/i`
- Uses `decodeURIComponent()` to handle URL-encoded titles with special characters

### Loading Indicator
- **HTML (index.html lines 47-53):** Spinner div, loading text, progress bar
- **CSS animations (styles.css lines 190-229):**
  - `@keyframes spin` - 360° rotation for spinner
  - `@keyframes indeterminate-progress` - Wave animation for progress bar
- **Dynamic messages:** `showLoading(show, message)` updates loading text

### Performance Optimization
- **Syllable caching (app.js line 506-518):** Instead of querying DOM for each syllable, elements are cached in `this.syllableCache` array with index as key
- **Auto-load speed:** No setTimeout delay - featured article fetches immediately
- **LocalStorage:** Theme preference persists across sessions without API calls

### Clinical Terminology
- Uses "prolonged speech" throughout (not "droning")
- References PacingEngine (not DroningEngine)
- Footer includes evidence-based citation links [1][2][3]

## Styling System

**CSS Architecture (styles.css):**
- **Theme variables** (lines 2-34): `--bg-primary`, `--text-primary`, `--btn-primary-bg`, etc.
- **Light/dark modes:** Controlled via `:root[data-theme="light"]` and `:root[data-theme="dark"]`
- **Responsive breakpoints:**
  - Tablet: max-width 1024px
  - Mobile: max-width 768px
  - Small mobile: max-width 480px
  - Extra small: max-width 360px
- **Container layout:** Flexbox column with `min-height: 100vh` and responsive padding
- **Component styling:** Each section (header, article-loader, article-section, control-panel) has consistent padding and border styling

## Common Modifications

### To change syllable speed range
- HTML: `index.html` lines 80-84 (min/max attributes on range input)
- JavaScript: Speed is passed directly to PacingEngine - no hardcoded limits

### To modify loading behavior
- UIController constructor (line 346): `this.loadFeaturedArticleOnInit()`
- Featured article load happens immediately - remove this call to prevent auto-load

### To change UI button text or placeholders
- `index.html` lines 35-55 (article loader section)
- Button text and input placeholders are directly in HTML

### To add new Wikipedia article fields
- WikipediaService.getArticleByTitle() (line 24-56)
- Modify `params` object (lines 25-34) - Wikipedia API query parameters
- Return object structure (lines 51-55) defines what fields are extracted

## External Dependencies

All loaded from CDN in `index.html`:

- **Hypher** (lines 101-102): English syllable hyphenation library
  - `https://cdnjs.cloudflare.com/ajax/libs/hypher/0.2.5/hypher.min.js`
  - `https://cdnjs.cloudflare.com/ajax/libs/hypher/0.2.5/patterns/en-us.js`
- **Wikipedia API:** Accessed via fetch() calls
- **Wikimedia Featured Article API:** Accessed via fetch() calls

## Testing & Debugging

No automated tests exist. Manual testing checklist:
- Open `index.html` in browser → Featured article should load within 2-3 seconds
- Check browser console (F12) for any API errors
- Test URL parsing: paste full Wikipedia URL in input field → should extract title
- Test syllable parsing: articles with acronyms/numbers should display correctly
- Verify theme toggle persists across page reload
- Check mobile responsiveness at breakpoints listed above

## Important Notes

- **No minification or build process** - All files are served as-is
- **CORS:** Wikipedia API handles CORS; no proxy needed
- **Theme persistence:** Uses localStorage only - ensure not disabled in browser
- **Featured article timing:** Wikimedia API updates featured article at midnight UTC daily
- **Syllable accuracy:** Hypher provides ~95% accuracy; fallback regex is simpler but works for most English text
- **Clinical disclaimer:** Footer must always include disclaimer about not being clinical treatment (see line 96 in index.html)
