# Magpie Talk

**A browser-based practice tool for prolonged speech technique** — auto-loads articles and highlights syllables one at a time to support fluency-shaping exercises.

Magpie Talk is designed to support **prolonged speech** and **syllable-timed speech** practice—techniques used in fluency-shaping therapy for stuttering. The tool highlights text one syllable at a time at a user-controlled pace, creating a structured environment for slow, stable, extended-syllable reading.

## What Is Prolonged Speech?

**Prolonged Speech** (also called *extended syllable duration* or *syllable-timed speech*) is a technique used in fluency-shaping therapy. Each syllable is stretched to reduce speech rate, stabilize timing, reduce articulatory pressure, and promote continuous phonation. Research shows that speech-restructuring approaches—including prolonged speech—are effective in reducing stuttering frequency for many adults (Brignell et al., 2020; Packman, 1994; Blomgren, 2013; Mallard et al., 1985).

Magpie Talk provides a self-guided way to practise this technique during reading.

## Features

- **Auto-Load Featured Article**: Wikipedia's featured article loads automatically when you open the app
- **Search Articles**: Enter any Wikipedia article title to load it instantly (with URL support)
- **Syllable Highlighting**: Automatic syllable-by-syllable highlighting with smooth animations
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
- Hypher library for accurate syllable parsing (loaded from CDN)
- Wikipedia API for article fetching
- LocalStorage for theme preference

## Browser Requirements

- Modern browser with ES6 support (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- CORS support for fetching Wikipedia articles

## Technical Details

### Components

- **WikipediaService**: Fetches featured articles and custom articles from Wikipedia API
- **SyllableParser**: Uses the Hypher library to accurately split words into syllables
- **PacingEngine**: Manages the highlighting sequence, timing, and pause/resume state
- **ThemeManager**: Handles dark/light mode with localStorage persistence
- **UIController**: Coordinates all components and handles user interactions

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

- `index.html` - Main HTML structure and UI
- `styles.css` - Styling and theme definitions
- `app.js` - Application logic (Wikipedia API, syllable parsing, pacing engine)
- `README.md` - This file

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
