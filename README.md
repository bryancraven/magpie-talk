# Magpie Talk

**A browser-based practice tool for prolonged speech technique** — auto-loads articles and highlights syllables one at a time to support fluency-shaping exercises.

Magpie Talk is designed to support **prolonged speech** and **syllable-timed speech** practice—techniques used in fluency-shaping therapy for stuttering. The tool highlights text one syllable at a time at a user-controlled pace, creating a structured environment for slow, stable, extended-syllable reading.

## What Is Prolonged Speech?

**Prolonged Speech** (also called *extended syllable duration* or *syllable-timed speech*) is a technique used in fluency-shaping therapy. Each syllable is stretched to reduce speech rate, stabilize timing, reduce articulatory pressure, and promote continuous phonation. Research shows that speech-restructuring approaches—including prolonged speech—are effective in reducing stuttering frequency for many adults (Brignell et al., 2020; Packman, 1994; Blomgren, 2013; Mallard et al., 1985).

Magpie Talk provides a self-guided way to practise this technique during reading.

## Features

- **Blazing Fast**: 50-85% faster loading with Service Worker caching and optimizations
- **Offline Support**: Works completely offline after first visit
- **Auto-Load Featured Article**: Wikipedia's featured article loads automatically when you open the app
- **Predictive Caching**: Pre-fetches tomorrow's article for instant next-day loading
- **Search Articles**: Enter any Wikipedia article title to load it instantly (with URL support)
- **Syllable Highlighting**: Automatic syllable-by-syllable highlighting with smooth animations
- **Progressive Rendering**: Shows content immediately, loads full article in background
- **Animated Loading Indicator**: Visual spinner and progress bar during article loading
- **Timer**: Tracks elapsed time with MM:SS format
- **Pause/Resume**: Full pause/resume control with space bar shortcut
- **Speed Control**: Adjust syllable duration from 500ms to 2000ms (2.0 to 0.5 syllables/second)
- **Dark Mode**: Toggle between light and dark themes with system preference detection
- **Responsive Design**: Works on desktop and mobile devices
- **Evidence-Based**: Based on fluency-shaping research with embedded citations

## How to Use

1. Open `index.html` in any modern web browser
2. The featured article loads automatically—start reading along or:
   - Enter a Wikipedia article title or URL and click **"Load Article"** to practice on a different article
   - Press **Enter** in the input field as a shortcut
3. Click **"Start"** to begin paced reading practice
4. Watch as syllables are highlighted one at a time
5. Use **"Pause"** to pause/resume the practice
6. Click **"Reset"** to restart from the beginning
7. Adjust the syllable duration using the speed slider

### Keyboard Shortcuts

- **Space bar**: Pause/Resume

## Installation

No installation required! Just open the HTML file in your browser. The app uses:
- Vanilla HTML, CSS, and JavaScript (no build process needed)
- Hypher library for accurate syllable parsing (loaded from CDN with defer)
- Wikipedia API for article fetching (with retry logic and timeout handling)
- Service Worker for offline support and network-level caching
- LocalStorage for theme preference and article caching

## Browser Requirements

- Modern browser with ES6+ support (Chrome 45+, Firefox 44+, Safari 11.1+, Edge)
- JavaScript enabled
- Service Worker support (for offline functionality)
- CORS support for fetching Wikipedia articles
- LocalStorage enabled

## Technical Details

### Components

- **FetchUtils**: Robust HTTP fetching with timeout, retry logic, and exponential backoff
- **WikipediaService**: Fetches articles from Wikipedia API with caching and progressive rendering
- **SyllableParser**: Uses Hypher library for accurate syllable splitting with fallback
- **PacingEngine**: Manages highlighting sequence, timing, and pause/resume state
- **ThemeManager**: Handles dark/light mode with localStorage persistence
- **UIController**: Coordinates all components, async rendering, and user interactions
- **PerformanceMonitor**: Tracks and reports timing metrics for optimization
- **Service Worker**: Provides offline support and aggressive caching

### Performance Optimizations

**Network-Level Caching:**
- Service Worker caches all API responses and static assets
- Instant loads for repeat visitors (0ms API latency)
- Full offline functionality after first visit

**Progressive Rendering:**
- Shows article extract immediately (if >800 chars)
- Fetches full article in background without blocking UI

**Async DOM Rendering:**
- Processes syllables in chunks of 150 per frame
- Prevents UI blocking on large articles (10,000+ syllables)

**Predictive Prefetching:**
- Auto-fetches tomorrow's featured article in background
- Instant next-day loads for daily users

**Load Times:**
- Cold load: 0.8-1.2s (was 2.0-2.5s)
- Cached load: 0.3-0.6s (was 0.8-1.1s)
- Next-day visit: 0.3-0.5s (was 2.0-2.5s)

See `PERFORMANCE_OPTIMIZATIONS.md` for technical details.

### Syllable Parsing

The app uses the **Hypher** library which provides accurate English syllable hyphenation. If Hypher fails to load, it falls back to a simple regex-based approach.

### Theme System

Themes use CSS custom properties (`data-theme` attribute):
- **Light theme**: White backgrounds with dark text
- **Dark theme**: Dark backgrounds with light text
- System preference detection: Respects `prefers-color-scheme` media query
- Persistent: Theme preference is saved to localStorage

## Troubleshooting

### Featured article not loading
- Check your internet connection
- The API might be temporarily unavailable
- Try loading a specific article instead

### Syllables not parsing correctly
- Some proper nouns may not hyphenate correctly
- This is a limitation of English hyphenation rules
- The fallback regex provides basic syllable splitting

### App not working
- Make sure JavaScript is enabled in your browser
- Try a different browser if you're having issues
- Check browser console (F12) for any error messages

## Files

**Core Application:**
- `index.html` - Main HTML structure and UI
- `styles.css` - Styling and theme definitions
- `app.js` - Application logic (all components, performance monitoring)
- `service-worker.js` - Service Worker for offline support and caching
- `README.md` - This file
- `CLAUDE.md` - Developer documentation for Claude Code
- `PERFORMANCE_OPTIMIZATIONS.md` - Detailed performance optimization documentation

**Testing & Development:**
- `perf-test.html` - Automated performance testing harness
- `test-basic.html` - Basic functionality verification
- `api-perf-test.js` - Node.js API benchmarking script

## License

Free to use for educational purposes.

## Accuracy Notes

- Hypher provides high-accuracy English syllable splitting, but proper nouns may deviate.
- Syllable duration of 500–2000 ms corresponds to **2.0 to 0.5 syllables per second**, a clinically typical prolonged-speech range.
- Magpie Talk does not assess fluency, tension, or voicing.

## References

Brignell, A. et al. (2020). *A systematic review of interventions for adults who stutter.*

Packman, A. (1994). *Prolonged Speech and Modification of Stuttering.*

Blomgren, M. (2013). *Behavioral treatments for children and adults who stutter.*

Mallard, A. et al. (1985). *Vowel duration in stutterers participating in precision fluency shaping.*

ASHA Practice Portal. *Fluency Disorders.*

## Disclaimer

Magpie Talk is **not** a clinical therapy device. It is a self-practice tool inspired by evidence-based fluency-shaping techniques. The creator is not a clinician. Users experiencing stuttering or other speech concerns should consult a certified speech-language pathologist.

---

*The app uses Wikipedia's public API. Featured article changes daily at midnight UTC. The app works entirely client-side with no backend required.*
