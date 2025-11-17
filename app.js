// ============================================================
// UTILITIES
// ============================================================

class FetchUtils {
    static async fetchWithTimeout(url, options = {}, timeout = 15000, retries = 3) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }

                return response;
            } catch (error) {
                const isLastAttempt = attempt === retries;

                if (error.name === 'AbortError') {
                    console.warn('Request timeout (attempt ' + (attempt + 1) + '/' + (retries + 1) + '):', url);
                    if (isLastAttempt) {
                        throw new Error('Request timed out after ' + timeout + 'ms. Please check your internet connection.');
                    }
                } else {
                    console.warn('Request failed (attempt ' + (attempt + 1) + '/' + (retries + 1) + '):', error.message);
                    if (isLastAttempt) {
                        throw error;
                    }
                }

                // Exponential backoff: wait 1s, 2s, 4s between retries
                if (!isLastAttempt) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log('Retrying in ' + delay + 'ms...');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }
}

// ============================================================
// WIKIPEDIA SERVICE
// ============================================================

class WikipediaService {
    // Cache storage key prefix
    static CACHE_PREFIX = 'magpie_cache_';

    // Check if a cached item is still valid
    static isCacheValid(cacheItem) {
        if (!cacheItem || !cacheItem.expiresAt) return false;
        return Date.now() < cacheItem.expiresAt;
    }

    // Get item from cache
    static getCachedItem(key) {
        try {
            const item = localStorage.getItem(this.CACHE_PREFIX + key);
            if (!item) return null;
            const cacheItem = JSON.parse(item);
            if (this.isCacheValid(cacheItem)) {
                return cacheItem.article;
            } else {
                // Cache expired, remove it
                localStorage.removeItem(this.CACHE_PREFIX + key);
                return null;
            }
        } catch (e) {
            console.warn('Cache retrieval failed:', e);
            return null;
        }
    }

    // Store item in cache with expiry time
    static setCachedItem(key, article, expiryMs) {
        try {
            const cacheItem = {
                article: article,
                expiresAt: Date.now() + expiryMs
            };
            localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheItem));
        } catch (e) {
            console.warn('Cache storage failed:', e);
        }
    }

    static async getFeaturedArticle(year, month, day) {
        const dateStr = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        const cacheKey = `featured_${dateStr}`;

        // Check cache first (24-hour TTL for featured articles)
        const cachedArticle = this.getCachedItem(cacheKey);
        if (cachedArticle) {
            console.log('Using cached featured article');
            return cachedArticle;
        }

        const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${dateStr}`;
        console.log('Fetching featured article from API:', url);

        perfMon.start('API: Featured Article Fetch');
        const response = await FetchUtils.fetchWithTimeout(url, {
            headers: {
                'Api-User-Agent': 'MagpieTalk/1.0 (https://github.com/bryancraven/magpie-talk; bryancraven@users.noreply.github.com)'
            }
        }, 15000, 2);
        const data = await response.json();
        perfMon.end('API: Featured Article Fetch');
        const article = data.tfa;

        // Create extract article immediately for progressive rendering
        const extractArticle = {
            title: article.title,
            text: article.extract,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`
        };

        // Check if the extract is substantial (>800 chars)
        if (article.extract && article.extract.length > 800) {
            // Extract is large enough, use it as-is
            this.setCachedItem(cacheKey, extractArticle, 86400000);
            return extractArticle;
        } else {
            // Extract is too small - show it immediately, then fetch full article in background
            // Set up background fetch for full article (will be handled by UIController)
            const fullArticlePromise = this.getArticleByTitle(article.title)
                .then(fullArticle => {
                    // Cache the full article for next time
                    this.setCachedItem(cacheKey, fullArticle, 86400000);
                    return fullArticle;
                })
                .catch(error => {
                    console.warn('Failed to fetch full article, keeping extract:', error);
                    return extractArticle; // Fallback to extract if full article fails
                });

            // Return extract immediately with promise for full article
            extractArticle._fullArticlePromise = fullArticlePromise;
            return extractArticle;
        }
    }

    static async getArticleByTitle(title) {
        const cacheKey = `article_${title.toLowerCase()}`;

        // Check cache first (session-based cache)
        const cachedArticle = this.getCachedItem(cacheKey);
        if (cachedArticle) {
            console.log('Using cached article:', title);
            return cachedArticle;
        }

        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            prop: 'extracts',
            titles: title,
            explaintext: true,
            exintro: false,  // Get full article, not just intro
            redirects: 1,
            origin: '*'
        });

        const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
        console.log('Fetching article from API:', title);

        perfMon.start('API: Full Article Fetch');
        const response = await FetchUtils.fetchWithTimeout(url, {
            headers: {
                'Api-User-Agent': 'MagpieTalk/1.0 (https://github.com/bryancraven/magpie-talk; bryancraven@users.noreply.github.com)'
            }
        }, 15000, 2);
        const data = await response.json();
        perfMon.end('API: Full Article Fetch');
        const pages = data.query.pages;
        const page = Object.values(pages)[0];

        if (page.missing !== undefined) {
            throw new Error(`Article "${title}" not found`);
        }

        const article = {
            title: page.title,
            text: page.extract || '',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
        };

        // Cache for 7 days (604800000 ms)
        this.setCachedItem(cacheKey, article, 604800000);

        return article;
    }

    static extractPlainText(html) {
        // Create a temporary element to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove script and style elements
        temp.querySelectorAll('script, style').forEach(el => el.remove());

        // Get text content and clean up whitespace
        let text = temp.textContent || '';
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }
}

// ============================================================
// SYLLABLE PARSER
// ============================================================

class SyllableParser {
    constructor() {
        this.hypher = null;
        this.initHypher();
    }

    initHypher() {
        if (typeof Hypher === 'undefined') {
            console.warn('Hypher library not loaded, using fallback syllable parsing');
            return;
        }

        try {
            this.hypher = new Hypher(Hyphenation.en_us);
        } catch (e) {
            console.warn('Failed to initialize Hypher, using fallback parsing:', e);
        }
    }

    parse(text) {
        // Clean up repeated punctuation marks in the text first
        let cleanedText = text
            .replace(/([,;!?])\1+/g, '$1')  // Replace multiple commas/semicolons/etc with single
            .replace(/([—-])\1+/g, '$1')     // Replace multiple dashes with single
            .replace(/(['"])\1+/g, '$1');    // Replace multiple quotes with single

        // Match words with any following punctuation/spaces
        const wordRegex = /(\w+)([^a-zA-Z0-9]*)/g;
        const syllables = [];
        const wordMap = []; // Track which syllables belong to which word
        let match;

        while ((match = wordRegex.exec(cleanedText)) !== null) {
            const word = match[1]; // Use match[1] for the word group (not match[0])
            const following = match[2]; // Punctuation/spacing after word

            if (!word) continue; // Skip empty matches

            const wordStart = syllables.length;

            // Check if word is a number - split digits individually
            let wordSyllables;
            if (/^\d+$/.test(word)) {
                // Split numbers into individual digits
                wordSyllables = word.split('');
            } else if (/^[A-Z]{2,}$/.test(word)) {
                // Split acronyms (all caps with 2+ letters) into individual letters
                wordSyllables = word.split('');
            } else {
                wordSyllables = this.syllabifyWord(word);
            }

            syllables.push(...wordSyllables);
            wordMap.push({
                word: word,
                following: following,
                startIndex: wordStart,
                endIndex: wordStart + wordSyllables.length - 1,
                syllables: wordSyllables
            });
        }

        return { syllables, wordMap };
    }

    syllabifyWord(word) {
        const lowerWord = word.toLowerCase();
        let syllables;

        if (this.hypher) {
            try {
                syllables = this.hypher.hyphenate(lowerWord).split('-');
            } catch (e) {
                syllables = this.fallbackSyllabify(lowerWord);
            }
        } else {
            syllables = this.fallbackSyllabify(lowerWord);
        }

        // Preserve original case by mapping syllables back to original word
        return this.applyOriginalCase(word, syllables);
    }

    applyOriginalCase(originalWord, syllables) {
        // Map lowercase syllables back to original case
        const casePreservedSyllables = [];
        let charIndex = 0;

        for (const syllable of syllables) {
            let preservedSyllable = '';

            for (let i = 0; i < syllable.length; i++) {
                if (charIndex < originalWord.length) {
                    preservedSyllable += originalWord[charIndex];
                    charIndex++;
                }
            }

            casePreservedSyllables.push(preservedSyllable);
        }

        return casePreservedSyllables;
    }

    fallbackSyllabify(word) {
        // Simple regex-based syllabification for fallback
        // This is less accurate but works without Hypher
        const pattern = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;
        const matches = word.match(pattern);
        return matches ? matches : [word];
    }
}

// ============================================================
// PACING ENGINE
// ============================================================

class PacingEngine {
    constructor(syllables, options = {}) {
        this.syllables = syllables;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.speed = options.speed || 1000; // milliseconds per syllable
        this.onSyllableChange = options.onSyllableChange || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.timeoutId = null;
        this.startTime = 0;
        this.pausedTime = 0;
    }

    start() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = Date.now() - this.pausedTime;
        this.highlightSyllable();
    }

    pause() {
        if (!this.isPlaying || this.isPaused) return;

        this.isPaused = true;
        this.pausedTime = Date.now() - this.startTime;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    resume() {
        if (!this.isPaused) return;
        this.isPlaying = true;
        this.isPaused = false;
        // Recalculate start time to preserve elapsed time
        this.startTime = Date.now() - this.pausedTime;
        this.highlightSyllable();
    }

    reset() {
        this.stop();
        this.currentIndex = 0;
        this.pausedTime = 0;
        this.onSyllableChange(0, this.syllables[0] || '');
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    highlightSyllable() {
        if (this.currentIndex >= this.syllables.length) {
            this.stop();
            this.onComplete();
            return;
        }

        const syllable = this.syllables[this.currentIndex];
        this.onSyllableChange(this.currentIndex, syllable);
        this.currentIndex++;

        this.timeoutId = setTimeout(() => {
            if (this.isPlaying) {
                this.highlightSyllable();
            }
        }, this.speed);
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    getProgress() {
        return {
            current: this.currentIndex,
            total: this.syllables.length,
            percentage: this.syllables.length > 0
                ? Math.round((this.currentIndex / this.syllables.length) * 100)
                : 0
        };
    }

    getElapsedTime() {
        if (!this.isPlaying && this.pausedTime === 0) return 0;
        if (this.isPaused) return this.pausedTime;
        return Date.now() - this.startTime;
    }
}

// ============================================================
// THEME MANAGER
// ============================================================

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || this.getSystemTheme();
        this.applyTheme(this.currentTheme);
    }

    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }
}

// ============================================================
// FONT SIZE MANAGER
// ============================================================

class FontSizeManager {
    constructor() {
        this.currentSize = localStorage.getItem('fontSize') || 'medium';
        this.applyFontSize(this.currentSize);
    }

    setSize(size) {
        this.currentSize = size;
        this.applyFontSize(size);
    }

    applyFontSize(size) {
        document.documentElement.setAttribute('data-font-size', size);
        localStorage.setItem('fontSize', size);
    }
}

// ============================================================
// UI CONTROLLER
// ============================================================

class UIController {
    constructor() {
        this.themeManager = new ThemeManager();
        this.fontSizeManager = new FontSizeManager();
        this.parser = new SyllableParser();
        this.engine = null;
        this.articleContent = null;
        this.timerInterval = null;
        this.syllableCache = []; // Cache syllable elements for performance

        // Progressive rendering: Track pending promise to prevent race conditions
        this.pendingFullArticlePromise = null;
        this.pendingPromiseCancelled = false;

        // Target duration for time-based progress (default: 10 minutes)
        const savedDuration = localStorage.getItem('targetDuration');
        this.targetDuration = savedDuration ? parseInt(savedDuration) : 600000; // milliseconds

        this.initElements();

        // Initialize duration control value from targetDuration
        this.elements.durationControl.value = Math.floor(this.targetDuration / 60000);

        // Initialize font size control value from localStorage
        this.elements.fontSizeControl.value = this.fontSizeManager.currentSize;

        // Initialize progress marks
        this.updateProgressMarks();

        this.attachEventListeners();
        this.loadFeaturedArticleOnInit();
    }

    loadFeaturedArticleOnInit() {
        // Load featured article immediately when page loads
        this.loadFeaturedArticle();
    }

    toggleLoaderContent() {
        // Toggle visibility of loader content (article input section)
        const isHidden = this.elements.loaderContent.classList.toggle('hidden');
        this.elements.loaderToggle.setAttribute('aria-expanded', !isHidden);
    }

    initElements() {
        this.elements = {
            themeToggle: document.getElementById('themeToggle'),
            loaderToggle: document.getElementById('loaderToggle'),
            loaderContent: document.getElementById('loaderContent'),
            articleInput: document.getElementById('articleInput'),
            loadCustomBtn: document.getElementById('loadCustomBtn'),
            articleTitle: document.getElementById('articleTitle'),
            articleContent: document.getElementById('articleContent'),
            quickstartBtn: document.getElementById('quickstartBtn'),
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            timer: document.getElementById('timer'),
            speedControl: document.getElementById('speedControl'),
            speedValue: document.getElementById('speedValue'),
            durationControl: document.getElementById('durationControl'),
            fontSizeControl: document.getElementById('fontSizeControl'),
            timeProgressFill: document.getElementById('timeProgressFill'),
            timeProgressText: document.getElementById('timeProgressText'),
            timeProgressMarks: document.getElementById('timeProgressMarks'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            errorMessage: document.getElementById('errorMessage'),
            progressInfo: document.getElementById('progressInfo')
        };
    }

    attachEventListeners() {
        this.elements.themeToggle.addEventListener('click', () => {
            this.themeManager.toggle();
        });

        this.elements.loaderToggle.addEventListener('click', () => {
            this.toggleLoaderContent();
        });

        this.elements.loadCustomBtn.addEventListener('click', () => {
            const title = this.elements.articleInput.value.trim();
            if (title) {
                this.loadArticleByTitle(title);
            }
        });

        this.elements.articleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const title = this.elements.articleInput.value.trim();
                if (title) {
                    this.loadArticleByTitle(title);
                }
            }
        });

        this.elements.quickstartBtn.addEventListener('click', () => {
            this.startPractice();
        });

        this.elements.startBtn.addEventListener('click', () => {
            this.startPractice();
        });

        this.elements.pauseBtn.addEventListener('click', () => {
            this.togglePause();
        });

        this.elements.resetBtn.addEventListener('click', () => {
            this.resetPractice();
        });

        this.elements.speedControl.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            this.elements.speedValue.textContent = `${speed}ms`;
            if (this.engine) {
                this.engine.setSpeed(speed);
            }
        });

        this.elements.durationControl.addEventListener('input', (e) => {
            const durationMinutes = parseInt(e.target.value);
            this.targetDuration = durationMinutes * 60000; // Convert minutes to milliseconds
            localStorage.setItem('targetDuration', this.targetDuration.toString());
            // Update progress marks for new duration
            this.updateProgressMarks();
            // Update progress display if timer is running
            if (this.engine) {
                this.updateTimeProgress();
            }
        });

        this.elements.fontSizeControl.addEventListener('change', (e) => {
            const fontSize = e.target.value;
            this.fontSizeManager.setSize(fontSize);
        });

        // Keyboard shortcut: space to pause/resume (but not when typing in input)
        document.addEventListener('keydown', (e) => {
            // Don't trigger if user is typing in an input field
            const isFocusedOnInput = document.activeElement === this.elements.articleInput;

            if (e.code === 'Space' && this.engine && !isFocusedOnInput) {
                e.preventDefault();
                this.togglePause();
            }
        });
    }

    async loadFeaturedArticle() {
        const loadingStartTime = Date.now();
        console.log('Starting to load featured article...');
        perfMon.start('Total: Load Featured Article');

        try {
            // Cancel any pending full article promise from previous loads
            this.pendingPromiseCancelled = true;

            this.showLoading(true, 'Fetching featured article from Wikipedia...');
            this.clearError();
            this.disableLoadButtons(true);

            const today = new Date();
            console.log('Requesting featured article for:', today.toDateString());

            const article = await WikipediaService.getFeaturedArticle(
                today.getFullYear(),
                today.getMonth() + 1,
                today.getDate()
            );

            console.log('Featured article received:', article.title);
            await this.displayArticle(article);

            perfMon.end('Total: Load Featured Article');
            perfMon.report();

            // Predictive caching: Pre-fetch tomorrow's featured article in background
            this.prefetchTomorrowArticle();

            // Handle progressive rendering: if full article is loading in background, update when ready
            if (article._fullArticlePromise) {
                // Reset cancellation flag for this new promise
                this.pendingPromiseCancelled = false;
                this.pendingFullArticlePromise = article._fullArticlePromise;

                article._fullArticlePromise.then(async fullArticle => {
                    // Only update if this promise wasn't cancelled (e.g., by loading a different article)
                    if (!this.pendingPromiseCancelled) {
                        // Update the article with full text while preserving play state
                        await this.updateArticleContent(fullArticle);
                    }
                }).catch(error => {
                    // Silently fail - keep showing extract
                    if (!this.pendingPromiseCancelled) {
                        console.warn('Progressive article update failed:', error);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load featured article:', error);

            // Provide user-friendly error message based on error type
            let errorMessage = 'Error loading featured article. ';

            if (error.message.includes('timed out')) {
                errorMessage += 'The request took too long. Please check your internet connection and try again.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage += 'Could not connect to Wikipedia. Please check your internet connection.';
            } else if (error.message.includes('HTTP')) {
                errorMessage += 'Wikipedia API returned an error (' + error.message + '). Please try again later.';
            } else {
                errorMessage += error.message;
            }

            this.showError(errorMessage);

            // Show instructions to retry
            setTimeout(() => {
                const currentError = this.elements.errorMessage.textContent;
                if (
                    currentError.includes(errorMessage) &&
                    !this.elements.errorMessage.classList.contains('hidden')
                ) {
                    this.elements.errorMessage.textContent = currentError + ' Click "Load different article" to try again or load a specific article.';
                }
            }, 1000);
        } finally {
            // Ensure loading indicator shows for at least 300ms for visibility
            const elapsed = Date.now() - loadingStartTime;
            if (elapsed < 300) {
                await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
            }
            this.showLoading(false);
            this.disableLoadButtons(false);
        }
    }

    async loadArticleByTitle(input) {
        const loadingStartTime = Date.now();
        const originalButtonText = this.elements.loadCustomBtn.textContent;
        console.log('Loading article by title/URL:', input);

        try {
            // Cancel any pending full article promise from featured article load
            this.pendingPromiseCancelled = true;

            this.showLoading(true, 'Fetching article from Wikipedia...');
            this.clearError();
            this.disableLoadButtons(true);
            this.elements.loadCustomBtn.textContent = 'Loading...';

            // Extract title from URL if needed
            let title = input.trim();

            // Check if input is a Wikipedia URL and extract the article title
            const urlPattern = /(?:https?:\/\/)?(?:[\w]+\.)?wikipedia\.org\/wiki\/([^#?]+)/i;
            const match = title.match(urlPattern);

            if (match) {
                // Extract the article title from the URL
                title = decodeURIComponent(match[1]);
                console.log('Extracted title from URL:', title);
            }

            const article = await WikipediaService.getArticleByTitle(title);
            console.log('Article received:', article.title);
            await this.displayArticle(article);
        } catch (error) {
            console.error('Failed to load article:', error);

            // Provide user-friendly error message based on error type
            let errorMessage = 'Error loading article "' + input + '". ';

            if (error.message.includes('not found')) {
                errorMessage += 'Article not found. Please check the title and try again.';
            } else if (error.message.includes('timed out')) {
                errorMessage += 'The request took too long. Please check your internet connection and try again.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage += 'Could not connect to Wikipedia. Please check your internet connection.';
            } else if (error.message.includes('HTTP')) {
                errorMessage += 'Wikipedia API returned an error (' + error.message + '). Please try again later.';
            } else {
                errorMessage += error.message;
            }

            this.showError(errorMessage);
        } finally {
            // Ensure loading indicator shows for at least 300ms for visibility
            const elapsed = Date.now() - loadingStartTime;
            if (elapsed < 300) {
                await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
            }
            this.showLoading(false);
            this.disableLoadButtons(false);
            this.elements.loadCustomBtn.textContent = originalButtonText;
        }
    }

    async renderSyllablesAsync(wordMap, parentElement) {
        // Render syllables in chunks to prevent UI blocking
        // This allows the browser to paint loading indicators and remain responsive
        const CHUNK_SIZE = 150; // Process 150 syllables per frame
        let fragment = document.createDocumentFragment();
        let syllableCount = 0;

        for (let i = 0; i < wordMap.length; i++) {
            const wordInfo = wordMap[i];

            // Create syllable spans for this word
            wordInfo.syllables.forEach((syllable, syllableIdx) => {
                const globalIndex = wordInfo.startIndex + syllableIdx;
                const syllSpan = document.createElement('span');
                syllSpan.className = 'syllable';
                syllSpan.textContent = syllable;
                syllSpan.dataset.index = globalIndex;
                fragment.appendChild(syllSpan);
                // Cache the syllable element for fast access
                this.syllableCache[globalIndex] = syllSpan;
                syllableCount++;
            });

            // Add original following punctuation/spacing
            if (wordInfo.following) {
                fragment.appendChild(document.createTextNode(wordInfo.following));
            }

            // Yield to browser every CHUNK_SIZE syllables to allow painting
            if (syllableCount >= CHUNK_SIZE) {
                // Append current chunk to DOM (fragment automatically empties itself)
                parentElement.appendChild(fragment);
                // Create new fragment for next chunk
                fragment = document.createDocumentFragment();
                syllableCount = 0;

                // Yield control to browser to paint and remain responsive
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }

        // Append any remaining syllables
        if (fragment.hasChildNodes()) {
            parentElement.appendChild(fragment);
        }
    }

    async displayArticle(article) {
        // Stop any active practice and timer before loading new article
        if (this.engine) {
            this.engine.stop();
        }
        this.stopTimer();

        // Validate article has content
        if (!article.text || article.text.trim().length === 0) {
            this.elements.articleContent.innerHTML = '';
            this.elements.articleTitle.textContent = '';
            this.showError('Article appears to be empty. Please try another article.');
            return;
        }

        this.articleContent = article;
        this.elements.articleTitle.textContent = article.title;

        // Show parsing indicator
        this.showLoading(true, 'Parsing syllables...');

        // Parse text into syllables with word mapping
        perfMon.start('Syllable Parsing');
        const parsed = this.parser.parse(article.text);
        const { syllables, wordMap } = parsed;
        perfMon.end('Syllable Parsing');

        // Validate that we have syllables to work with
        if (syllables.length === 0) {
            this.elements.articleContent.innerHTML = '';
            this.elements.articleTitle.textContent = '';
            this.showError('Could not parse syllables from article. Please try another article.');
            this.showLoading(false);
            return;
        }

        // Update loading message
        this.showLoading(true, `Rendering ${syllables.length.toLocaleString()} syllables...`);

        // Create display with natural word flowing
        const articleDiv = this.elements.articleContent;
        articleDiv.innerHTML = '';

        // Add article intro text
        const introText = document.createElement('p');
        introText.className = 'article-intro';
        introText.innerHTML = `<em>Featured article of the day: <a href="${article.url}" target="_blank" class="article-source-link">source</a></em>`;
        articleDiv.appendChild(introText);

        // Create main content - render all syllables naturally with original punctuation
        const mainContent = document.createElement('p');
        mainContent.className = 'article-text';

        // Clear syllable cache for new article
        this.syllableCache = [];

        // Render syllables asynchronously
        perfMon.start('DOM Rendering');
        await this.renderSyllablesAsync(wordMap, mainContent);
        perfMon.end('DOM Rendering');

        articleDiv.appendChild(mainContent);

        // Initialize pacing engine
        this.engine = new PacingEngine(syllables, {
            speed: parseInt(this.elements.speedControl.value),
            onSyllableChange: (index, syllable) => this.highlightSyllable(index),
            onComplete: () => this.onPracticeComplete()
        });

        // Enable buttons
        this.elements.quickstartBtn.disabled = false;
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        this.elements.resetBtn.disabled = false;
        this.updateProgressInfo();
    }

    async updateArticleContent(updatedArticle) {
        // Progressive rendering: update article content while preserving play state
        // This is called when the full article arrives after showing the extract

        if (!updatedArticle.text || updatedArticle.text.trim().length === 0) {
            return; // Keep existing content if update fails
        }

        // Parse new text into syllables
        const parsed = this.parser.parse(updatedArticle.text);
        const { syllables, wordMap } = parsed;

        if (syllables.length === 0) {
            return; // Keep existing content if parsing fails
        }

        // Optimization: Skip update if the new article isn't significantly longer
        // This prevents unnecessary re-rendering when extract is already substantial
        const currentSyllableCount = this.engine ? this.engine.syllables.length : 0;
        const newSyllableCount = syllables.length;
        const increasePercentage = ((newSyllableCount - currentSyllableCount) / currentSyllableCount) * 100;

        // Only update if new article has at least 20% more syllables (significant content addition)
        if (currentSyllableCount > 0 && increasePercentage < 20) {
            console.log(`Skipping progressive update: only ${increasePercentage.toFixed(1)}% more content`);
            return;
        }

        // Show loading indicator during update
        this.showLoading(true, 'Loading full article...');

        // Update loading message
        this.showLoading(true, `Rendering ${syllables.length.toLocaleString()} syllables...`);

        // Preserve FULL play state: position, elapsed time, pause status
        const wasPlaying = this.engine && this.engine.isPlaying;
        const wasPaused = this.engine && this.engine.isPaused;
        const currentIndex = this.engine ? this.engine.currentIndex : 0;
        const elapsedTime = this.engine ? (this.engine.pausedTime || 0) : 0;

        // Stop current engine
        if (this.engine) {
            this.engine.stop();
        }

        // Update article content
        this.articleContent = updatedArticle;

        // Re-render with new syllables
        const articleDiv = this.elements.articleContent;

        // Remove BOTH intro and content from previous render to prevent duplication
        const textParagraph = articleDiv.querySelector('.article-text');
        const introParagraph = articleDiv.querySelector('.article-intro');

        if (textParagraph) {
            textParagraph.remove();
        }
        if (introParagraph) {
            introParagraph.remove();
        }

        // Re-add intro text
        const introText = document.createElement('p');
        introText.className = 'article-intro';
        introText.innerHTML = `<em>Featured article of the day: <a href="${updatedArticle.url}" target="_blank" class="article-source-link">source</a></em>`;
        articleDiv.appendChild(introText);

        const mainContent = document.createElement('p');
        mainContent.className = 'article-text';

        // Clear old cache and build new one
        this.syllableCache = [];

        // Render syllables asynchronously
        await this.renderSyllablesAsync(wordMap, mainContent);

        articleDiv.appendChild(mainContent);

        // Create new pacing engine with updated syllables
        this.engine = new PacingEngine(syllables, {
            speed: parseInt(this.elements.speedControl.value),
            onSyllableChange: (index, syllable) => this.highlightSyllable(index),
            onComplete: () => this.onPracticeComplete()
        });

        // Restore play state with full state preservation
        if (wasPlaying || wasPaused) {
            // Restore position in new syllabl list (limit to valid range)
            this.engine.currentIndex = Math.min(currentIndex, syllables.length - 1);
            this.engine.pausedTime = elapsedTime;

            if (wasPlaying) {
                // Re-start playing from preserved position
                this.engine.start();
                this.startTimer();
                this.elements.startBtn.disabled = true;
                this.elements.pauseBtn.disabled = false;
            } else if (wasPaused) {
                // Preserve paused state without starting
                this.engine.isPaused = true;
                this.elements.startBtn.disabled = false;
                this.elements.pauseBtn.disabled = false;
                // Highlight the current syllable to show position
                this.highlightSyllable(this.engine.currentIndex);
            }
        } else {
            this.elements.startBtn.disabled = false;
            this.elements.pauseBtn.disabled = true;
        }

        this.elements.resetBtn.disabled = false;
        this.updateProgressInfo();
        this.showLoading(false);
    }

    highlightSyllable(index) {
        // Remove previous highlight (track last active to avoid DOM search)
        if (this.lastActiveSyllable) {
            this.lastActiveSyllable.classList.remove('active');
        }

        // Use cached syllable element instead of DOM query (major performance improvement)
        const currentSyllable = this.syllableCache[index];
        if (currentSyllable) {
            currentSyllable.classList.add('active');
            this.lastActiveSyllable = currentSyllable;

            // Auto-scroll to keep the syllable in view (center of viewport)
            const scrollContainer = this.elements.articleContent;
            const containerRect = scrollContainer.getBoundingClientRect();
            const syllableRect = currentSyllable.getBoundingClientRect();

            // Check if syllable is outside visible area
            if (syllableRect.top < containerRect.top || syllableRect.bottom > containerRect.bottom) {
                // Scroll the syllable to roughly the middle of the container
                const scrollTop = scrollContainer.scrollTop;
                const offset = syllableRect.top - containerRect.top;
                scrollContainer.scrollTop = scrollTop + offset - (containerRect.height / 2) + (syllableRect.height / 2);
            }
        }

        this.updateProgressInfo();
    }

    startPractice() {
        if (!this.engine) return;

        this.engine.start();
        this.elements.startBtn.disabled = true;
        this.elements.pauseBtn.disabled = false;
        this.startTimer();
    }

    togglePause() {
        if (!this.engine) return;

        if (this.engine.isPaused) {
            this.engine.resume();
            this.elements.pauseBtn.textContent = 'Pause';
            this.startTimer();
        } else {
            this.engine.pause();
            this.elements.pauseBtn.textContent = 'Resume';
            this.stopTimer();
        }
    }

    resetPractice() {
        if (!this.engine) return;

        this.engine.reset();
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        this.elements.pauseBtn.textContent = 'Pause';
        this.stopTimer();
        this.updateTimer();
        this.updateProgressInfo();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        if (!this.engine) return;

        const elapsed = this.engine.getElapsedTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        this.elements.timer.textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Update time-based progress bar
        this.updateTimeProgress();
    }

    updateTimeProgress() {
        if (!this.engine) return;

        const elapsed = this.engine.getElapsedTime();

        // Calculate percentage (capped at 100%)
        const percentage = Math.min(100, (elapsed / this.targetDuration) * 100);

        // Update progress bar fill width
        this.elements.timeProgressFill.style.width = `${percentage}%`;

        // Format elapsed time (M:SS)
        const elapsedMinutes = Math.floor(elapsed / 60000);
        const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
        const elapsedFormatted = `${elapsedMinutes}:${String(elapsedSeconds).padStart(2, '0')}`;

        // Format target time (M:SS)
        const targetMinutes = Math.floor(this.targetDuration / 60000);
        const targetSeconds = Math.floor((this.targetDuration % 60000) / 1000);
        const targetFormatted = `${targetMinutes}:${String(targetSeconds).padStart(2, '0')}`;

        // Update text display
        this.elements.timeProgressText.textContent =
            `${elapsedFormatted} / ${targetFormatted} (${Math.floor(percentage)}%)`;
    }

    updateProgressMarks() {
        // Clear existing marks
        this.elements.timeProgressMarks.innerHTML = '';

        // Calculate total minutes in target duration
        const totalMinutes = Math.floor(this.targetDuration / 60000);

        // Don't add marks if duration is less than 2 minutes
        if (totalMinutes < 2) return;

        // Calculate halfway point
        const halfwayMinute = Math.floor(totalMinutes / 2);

        // Create marks for each minute
        for (let minute = 1; minute < totalMinutes; minute++) {
            const mark = document.createElement('div');
            mark.className = 'time-progress-mark';

            // Make halfway mark more prominent
            if (minute === halfwayMinute) {
                mark.classList.add('halfway');
            }

            // Position mark as percentage of total duration
            const position = (minute / totalMinutes) * 100;
            mark.style.left = `${position}%`;

            this.elements.timeProgressMarks.appendChild(mark);
        }
    }

    updateProgressInfo() {
        if (!this.engine) return;

        const progress = this.engine.getProgress();

        // Clamp current to not exceed total
        const currentDisplay = Math.min(progress.current + 1, progress.total);

        this.elements.progressInfo.textContent =
            `Syllable ${currentDisplay} of ${progress.total} (${progress.percentage}%)`;
    }

    onPracticeComplete() {
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        this.elements.pauseBtn.textContent = 'Pause';
        this.stopTimer();
        this.elements.progressInfo.textContent = 'Practice complete!';
    }

    showLoading(show, message = 'Loading article...') {
        if (show) {
            const loadingText = this.elements.loadingIndicator.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
            this.elements.loadingIndicator.classList.remove('hidden');
        } else {
            this.elements.loadingIndicator.classList.add('hidden');
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
    }

    clearError() {
        this.elements.errorMessage.classList.add('hidden');
        this.elements.errorMessage.textContent = '';
    }

    disableLoadButtons(disabled) {
        this.elements.loadCustomBtn.disabled = disabled;
        this.elements.articleInput.disabled = disabled;
    }

    prefetchTomorrowArticle() {
        // Pre-fetch tomorrow's featured article in the background for instant loading
        // This runs after today's article has loaded successfully
        setTimeout(() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            console.log('🔮 Prefetching tomorrow\'s featured article for instant loading...');

            WikipediaService.getFeaturedArticle(
                tomorrow.getFullYear(),
                tomorrow.getMonth() + 1,
                tomorrow.getDate()
            ).then(() => {
                console.log('✅ Tomorrow\'s article cached successfully');
            }).catch((error) => {
                // Silently fail - this is just a performance optimization
                console.log('ℹ️ Could not prefetch tomorrow\'s article:', error.message);
            });
        }, 2000); // Wait 2 seconds after current article loads to avoid interfering
    }
}

// ============================================================
// PERFORMANCE MONITORING
// ============================================================

class PerformanceMonitor {
    constructor() {
        this.timings = {};
        this.marks = {};
    }

    start(label) {
        this.marks[label] = performance.now();
        console.log(`⏱️ [START] ${label}`);
    }

    end(label) {
        if (this.marks[label]) {
            const duration = performance.now() - this.marks[label];
            this.timings[label] = duration;
            console.log(`⏱️ [END] ${label}: ${duration.toFixed(2)}ms`);
            delete this.marks[label];
            return duration;
        }
        return null;
    }

    report() {
        console.log('📊 Performance Report:');
        console.table(this.timings);

        // Calculate total time to content
        const totalTime = Object.values(this.timings).reduce((sum, val) => sum + val, 0);
        console.log(`⏱️ Total Time to Content: ${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(2)}s)`);

        // If running in iframe (test harness), send data to parent
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'perfData',
                timings: this.timings
            }, '*');
        }

        return this.timings;
    }

    reset() {
        this.timings = {};
        this.marks = {};
    }
}

// Global performance monitor instance
const perfMon = new PerformanceMonitor();

// ============================================================
// INITIALIZE APP
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Calculate actual page load time using Navigation Timing API
    if (performance.timing) {
        const pageLoadTime = performance.timing.domContentLoadedEventStart - performance.timing.navigationStart;
        perfMon.timings['Page Load → DOMContentLoaded'] = pageLoadTime;
        console.log(`⏱️ [MEASURED] Page Load → DOMContentLoaded: ${pageLoadTime.toFixed(2)}ms`);
    }

    new UIController();
    registerServiceWorker();
});

// ============================================================
// SERVICE WORKER REGISTRATION
// ============================================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service Worker registered successfully:', registration.scope);

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Service Worker update found');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('📦 New Service Worker installed, will activate on next visit');
                        // Optionally show a notification to user about update
                    }
                });
            });

        } catch (error) {
            console.warn('⚠️ Service Worker registration failed:', error);
        }
    } else {
        console.log('ℹ️ Service Workers not supported in this browser');
    }
}
