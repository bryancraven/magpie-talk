# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Magpie Talk** is a browser-based speech practice tool for prolonged speech technique (fluency-shaping therapy for stuttering). It loads Wikipedia articles and highlights syllables one at a time at a user-controlled pace.

**Key Context:**
- Purely client-side: No build process, backend, or package manager
- Vanilla JavaScript/HTML/CSS (no frameworks)
- All external dependencies loaded from CDN
- Designed to load immediately with auto-loading featured article on page open
- **Highly optimized:** Service Worker caching, progressive rendering, predictive prefetching
- **Performance:** 50-85% faster loading across all scenarios (see PERFORMANCE_OPTIMIZATIONS.md)

## Architecture

The application uses a **modular class-based architecture** with clear separation of concerns:

### Core Classes (in `app.js`)

1. **FetchUtils** (lines 5-48)
   - Robust HTTP fetching with timeout and retry logic
   - Exponential backoff for failed requests (1s, 2s, 4s delays)
   - Handles network errors, timeouts, and HTTP errors gracefully

2. **WikipediaService** (lines 54-205)
   - Static methods for fetching articles from Wikipedia API
   - `getFeaturedArticle(year, month, day)` - Fetches featured article with progressive rendering
   - `getArticleByTitle(title)` - Fetches full article text by title
   - **Caching:** localStorage with configurable TTL (24h for featured, 7d for custom)
   - **User-Agent:** Compliant with Wikimedia API best practices
   - **Progressive rendering:** Shows extract immediately, fetches full article in background
   - Uses `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/` and `https://en.wikipedia.org/w/api.php`

3. **SyllableParser** (lines 211-322)
   - Splits text into syllables using Hypher library (loaded from CDN with defer)
   - Fallback regex-based parsing if Hypher unavailable
   - `parse(text)` - Returns `{ syllables: [], wordMap: [] }`
   - Handles special cases: acronyms, numbers, punctuation preservation
   - Word mapping tracks syllables per word (preserves layout)

4. **PacingEngine** (lines 328-426)
   - Manages the highlighting sequence and timing
   - `start()`, `pause()`, `resume()`, `stop()`, `reset()` - Playback controls
   - `setSpeed(speed)` - Adjusts milliseconds per syllable (500-2000ms)
   - Tracks elapsed time and progress percentage
   - Callbacks: `onSyllableChange(index, syllable)` and `onComplete()`

5. **ThemeManager** (lines 432-462)
   - Light/dark mode toggle with persistence
   - Uses `data-theme` attribute on `<html>` element
   - localStorage persistence
   - Respects system `prefers-color-scheme` on first load

6. **UIController** (lines 468-1135)
   - Orchestrates all components and user interactions
   - `loadFeaturedArticleOnInit()` - Auto-loads featured article immediately
   - `loadArticleByTitle(input)` - URL parsing regex extracts titles from Wikipedia URLs
   - `displayArticle(article)` - Renders with async chunked syllable rendering
   - `renderSyllablesAsync()` - Processes 150 syllables per frame to prevent UI blocking
   - `prefetchTomorrowArticle()` - Predictive caching for next-day instant loads
   - **Performance:** Syllable element caching in `this.syllableCache` array

7. **PerformanceMonitor** (lines 1140-1186)
   - Comprehensive timing instrumentation
   - Tracks page load, API fetch, parsing, rendering durations
   - Console logging with visual reports
   - Exports data to test harness via postMessage

8. **Service Worker Registration** (lines 1195-1236)
   - Registers `/service-worker.js` for offline support
   - Handles SW updates and lifecycle events
   - Graceful fallback if SW not supported

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

### Performance Optimizations (50-85% faster)

**Network-Level Caching (service-worker.js):**
- Service Worker implements aggressive caching for offline support
- Stale-while-revalidate strategy for Wikipedia API calls
- Cache-first for static assets (CSS, JS, Hypher library)
- Smart invalidation: 24h TTL for featured articles, 7d for custom articles
- Instant loads for repeat visitors (0ms API latency when cached)

**Progressive Rendering:**
- Shows article extract immediately if >800 chars
- Fetches full article in background without blocking UI
- Smart updates: only re-renders if >20% more content

**Async DOM Rendering:**
- Processes syllables in chunks of 150 per frame
- Uses `requestAnimationFrame()` to prevent UI blocking
- 10,000 syllables: ~400ms vs 2.5s blocking (6x faster)

**Syllable Element Caching:**
- Elements cached in `this.syllableCache` array by index
- O(1) access during highlighting vs O(n) DOM queries

**Predictive Prefetching:**
- Auto-fetches tomorrow's featured article 2s after load
- Instant next-day visits for daily users

**Deferred Script Loading:**
- Hypher library loads with `defer` attribute
- Non-blocking parallel downloads
- ~150-200ms faster initial page load

**Performance Monitoring:**
- Built-in instrumentation tracks all critical paths
- Console reports show timing breakdowns
- Test harness for automated profiling

See `PERFORMANCE_OPTIMIZATIONS.md` for complete technical details.

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

- **Hypher** (lines 114-115): English syllable hyphenation library (loaded with `defer`)
  - `https://cdnjs.cloudflare.com/ajax/libs/hypher/0.2.5/hypher.min.js`
  - `https://cdnjs.cloudflare.com/ajax/libs/hypher/0.2.5/patterns/en-us.js`
- **Wikipedia API:** `https://en.wikipedia.org/w/api.php` (accessed via fetch with User-Agent header)
- **Wikimedia Featured Article API:** `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/` (cached by Service Worker)

## Service Worker

**File:** `service-worker.js` (auto-registered in app.js)

**Features:**
- Network-level caching for offline support
- Cache version management with automatic cleanup
- Different strategies per resource type:
  - Wikipedia API: Stale-while-revalidate
  - Static assets: Cache-first
  - Other: Network-first with cache fallback
- Custom cache headers track expiration times
- Background revalidation for fresh content

**Cache Management:**
- View caches: DevTools → Application → Cache Storage
- Clear cache: `localStorage.clear()` + unregister SW in DevTools
- Update SW: Bump `CACHE_VERSION` in service-worker.js

## Testing & Debugging

**Automated Testing:**
- `perf-test.html` - Automated performance testing harness
  - Runs multiple loads with statistical analysis
  - Tracks timing distributions
  - Exports CSV data for analysis
- `test-basic.html` - Basic functionality verification
  - Checks browser API support
  - Validates file loading
  - Tests Wikipedia API reachability
- `api-perf-test.js` - Node.js API benchmarking script

**Manual Testing Checklist:**
- Open `index.html` → Featured article loads in 0.8-1.2s (cold) or 0.3-0.6s (cached)
- Browser console (F12) shows performance reports with timing breakdowns
- Service Worker registers successfully (check console for ✅ message)
- Test offline: Load once, disable network, reload → should work from cache
- Test URL parsing: paste Wikipedia URL → extracts title correctly
- Test syllable parsing: articles with acronyms/numbers display correctly
- Verify theme toggle persists across page reload
- Check mobile responsiveness at all breakpoints
- Test predictive caching: Wait 5s, check console for tomorrow's article prefetch

**Performance Monitoring:**
- Console shows detailed timing for each load phase
- `perfMon.report()` displays full breakdown
- Check Network tab in DevTools to verify caching
- Service Worker tab shows cache contents and status

## Important Notes

- **No minification or build process** - All files are served as-is
- **CORS:** Wikipedia API handles CORS; no proxy needed
- **Theme persistence:** Uses localStorage only - ensure not disabled in browser
- **Featured article timing:** Wikimedia API updates featured article at midnight UTC daily
- **Syllable accuracy:** Hypher provides ~95% accuracy; fallback regex is simpler but works for most English text
- **Clinical disclaimer:** Footer must always include disclaimer about not being clinical treatment (see line 96 in index.html)
