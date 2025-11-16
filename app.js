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
            return cachedArticle;
        }

        const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${dateStr}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch featured article: ${response.status}`);
        }

        const data = await response.json();
        const article = data.tfa;

        // Check if the featured article response includes extract/description
        // If it has substantial text (>1000 chars), use it; otherwise fetch full article
        let fullArticle;
        if (article.extract && article.extract.length > 1000) {
            fullArticle = {
                title: article.title,
                text: article.extract,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`
            };
        } else {
            // Get the title from featured article, then fetch the full article text
            fullArticle = await this.getArticleByTitle(article.title);
        }

        // Cache for 24 hours (86400000 ms)
        this.setCachedItem(cacheKey, fullArticle, 86400000);

        return fullArticle;
    }

    static async getArticleByTitle(title) {
        const cacheKey = `article_${title.toLowerCase()}`;

        // Check cache first (session-based cache)
        const cachedArticle = this.getCachedItem(cacheKey);
        if (cachedArticle) {
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

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch article: ${response.status}`);
        }

        const data = await response.json();
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
// UI CONTROLLER
// ============================================================

class UIController {
    constructor() {
        this.themeManager = new ThemeManager();
        this.parser = new SyllableParser();
        this.engine = null;
        this.articleContent = null;
        this.timerInterval = null;
        this.syllableCache = []; // Cache syllable elements for performance

        this.initElements();
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
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            timer: document.getElementById('timer'),
            speedControl: document.getElementById('speedControl'),
            speedValue: document.getElementById('speedValue'),
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
        try {
            this.showLoading(true, 'Loading featured article...');
            this.clearError();
            this.disableLoadButtons(true);

            const today = new Date();
            const article = await WikipediaService.getFeaturedArticle(
                today.getFullYear(),
                today.getMonth() + 1,
                today.getDate()
            );

            this.displayArticle(article);
        } catch (error) {
            this.showError(`Error loading featured article: ${error.message}`);
            console.error(error);
        } finally {
            this.showLoading(false);
            this.disableLoadButtons(false);
        }
    }

    async loadArticleByTitle(input) {
        const originalButtonText = this.elements.loadCustomBtn.textContent;
        try {
            this.showLoading(true, 'Loading article...');
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
            }

            const article = await WikipediaService.getArticleByTitle(title);
            this.displayArticle(article);
        } catch (error) {
            this.showError(`Error loading article: ${error.message}`);
            console.error(error);
        } finally {
            this.showLoading(false);
            this.disableLoadButtons(false);
            this.elements.loadCustomBtn.textContent = originalButtonText;
        }
    }

    displayArticle(article) {
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

        // Parse text into syllables with word mapping
        const parsed = this.parser.parse(article.text);
        const { syllables, wordMap } = parsed;

        // Validate that we have syllables to work with
        if (syllables.length === 0) {
            this.elements.articleContent.innerHTML = '';
            this.elements.articleTitle.textContent = '';
            this.showError('Could not parse syllables from article. Please try another article.');
            return;
        }

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

        // Use DocumentFragment to batch DOM operations for better performance
        const fragment = document.createDocumentFragment();

        wordMap.forEach((wordInfo) => {
            // Create syllable spans for this word (they will flow naturally)
            wordInfo.syllables.forEach((syllable, syllableIdx) => {
                const globalIndex = wordInfo.startIndex + syllableIdx;
                const syllSpan = document.createElement('span');
                syllSpan.className = 'syllable';
                syllSpan.textContent = syllable;
                syllSpan.dataset.index = globalIndex;
                fragment.appendChild(syllSpan);
                // Cache the syllable element for fast access
                this.syllableCache[globalIndex] = syllSpan;
            });

            // Add original following punctuation/spacing (e.g., ", ", ".", " ", etc.)
            if (wordInfo.following) {
                fragment.appendChild(document.createTextNode(wordInfo.following));
            }
        });

        mainContent.appendChild(fragment);
        articleDiv.appendChild(mainContent);

        // Initialize pacing engine
        this.engine = new PacingEngine(syllables, {
            speed: parseInt(this.elements.speedControl.value),
            onSyllableChange: (index, syllable) => this.highlightSyllable(index),
            onComplete: () => this.onPracticeComplete()
        });

        // Enable buttons
        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        this.elements.resetBtn.disabled = false;
        this.updateProgressInfo();
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
}

// ============================================================
// INITIALIZE APP
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    new UIController();
});
