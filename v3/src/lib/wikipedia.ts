/**
 * Wikipedia Service
 *
 * Handles fetching articles from Wikipedia API.
 * Preserved from original app.js with TypeScript types.
 */

export interface Article {
  title: string;
  text: string;
  url: string;
  extract?: string;
}

const CACHE_PREFIX = 'magpie_cache_';
const USER_AGENT = 'MagpieTalk/2.0 (https://github.com/bryancraven/magpie-talk)';

interface CacheItem {
  article: Article;
  expiresAt: number;
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 15000,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const err = error as Error;

      if (err.name === 'AbortError') {
        console.warn(`Request timeout (attempt ${attempt + 1}/${retries + 1}):`, url);
        if (isLastAttempt) {
          throw new Error(`Request timed out after ${timeout}ms. Please check your internet connection.`);
        }
      } else {
        console.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}):`, err.message);
        if (isLastAttempt) {
          throw error;
        }
      }

      // Exponential backoff
      if (!isLastAttempt) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Fetch failed after all retries');
}

/**
 * Check if a cached item is still valid
 */
function isCacheValid(cacheItem: CacheItem | null): boolean {
  if (!cacheItem || !cacheItem.expiresAt) return false;
  return Date.now() < cacheItem.expiresAt;
}

/**
 * Get item from localStorage cache
 */
function getCachedItem(key: string): Article | null {
  if (typeof window === 'undefined') return null;

  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;
    const cacheItem: CacheItem = JSON.parse(item);
    if (isCacheValid(cacheItem)) {
      return cacheItem.article;
    } else {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
  } catch (e) {
    console.warn('Cache retrieval failed:', e);
    return null;
  }
}

/**
 * Store item in localStorage cache with expiry time
 */
function setCachedItem(key: string, article: Article, expiryMs: number): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheItem: CacheItem = {
      article,
      expiresAt: Date.now() + expiryMs,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
  } catch (e) {
    console.warn('Cache storage failed:', e);
  }
}

/**
 * Fetch today's featured article from Wikipedia
 */
export async function getFeaturedArticle(
  year?: number,
  month?: number,
  day?: number
): Promise<Article> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const d = day ?? now.getDate();

  const dateStr = `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
  const cacheKey = `featured_${dateStr}`;

  // Check cache first (24-hour TTL)
  const cachedArticle = getCachedItem(cacheKey);
  if (cachedArticle) {
    console.log('Using cached featured article');
    return cachedArticle;
  }

  const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${dateStr}`;
  console.log('Fetching featured article from API:', url);

  const response = await fetchWithTimeout(url, {
    headers: {
      'Api-User-Agent': USER_AGENT,
    },
  });

  const data = await response.json();
  const tfa = data.tfa;

  const article: Article = {
    title: tfa.title,
    text: tfa.extract,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(tfa.title)}`,
    extract: tfa.extract,
  };

  // If extract is substantial (>800 chars), use it as-is
  if (tfa.extract && tfa.extract.length > 800) {
    setCachedItem(cacheKey, article, 86400000); // 24 hours
    return article;
  }

  // Otherwise fetch full article
  const fullArticle = await getArticleByTitle(tfa.title);
  setCachedItem(cacheKey, fullArticle, 86400000);
  return fullArticle;
}

/**
 * Fetch an article by its title
 */
export async function getArticleByTitle(title: string): Promise<Article> {
  const cacheKey = `article_${title.toLowerCase()}`;

  // Check cache first (7-day TTL)
  const cachedArticle = getCachedItem(cacheKey);
  if (cachedArticle) {
    console.log('Using cached article:', title);
    return cachedArticle;
  }

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'extracts',
    titles: title,
    explaintext: 'true',
    exintro: 'false',
    redirects: '1',
    origin: '*',
  });

  const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
  console.log('Fetching article from API:', title);

  const response = await fetchWithTimeout(url, {
    headers: {
      'Api-User-Agent': USER_AGENT,
    },
  });

  const data = await response.json();
  const pages = data.query.pages;
  const page = Object.values(pages)[0] as { title: string; extract?: string; missing?: boolean };

  if (page.missing !== undefined) {
    throw new Error(`Article "${title}" not found`);
  }

  const article: Article = {
    title: page.title,
    text: page.extract || '',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
  };

  // Cache for 7 days
  setCachedItem(cacheKey, article, 604800000);
  return article;
}

/**
 * Extract article title from a Wikipedia URL
 */
export function extractTitleFromUrl(input: string): string {
  const urlPattern = /(?:https?:\/\/)?(?:[\w]+\.)?wikipedia\.org\/wiki\/([^#?]+)/i;
  const match = input.match(urlPattern);

  if (match) {
    return decodeURIComponent(match[1].replace(/_/g, ' '));
  }

  return input.trim();
}
