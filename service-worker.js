// Magpie Talk Service Worker
// Provides offline support and aggressive caching for performance

const CACHE_VERSION = 'v1';
const CACHE_NAME = `magpie-talk-${CACHE_VERSION}`;

// Resources to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css',
    'https://cdnjs.cloudflare.com/ajax/libs/hypher/0.2.5/hypher.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/hypher/0.2.5/patterns/en-us.js'
];

// Wikipedia API patterns to cache
const WIKI_API_PATTERNS = [
    /^https:\/\/api\.wikimedia\.org\/feed\/v1\/wikipedia\/en\/featured\//,
    /^https:\/\/en\.wikipedia\.org\/w\/api\.php/
];

// Cache durations
const CACHE_DURATIONS = {
    static: 7 * 24 * 60 * 60 * 1000,      // 7 days for static assets
    featuredArticle: 24 * 60 * 60 * 1000,  // 24 hours for featured articles
    customArticle: 7 * 24 * 60 * 60 * 1000 // 7 days for custom articles
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => {
            console.log('[SW] Installation complete');
            return self.skipWaiting(); // Activate immediately
        }).catch((error) => {
            console.error('[SW] Installation failed:', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim(); // Take control immediately
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Determine caching strategy based on URL
    if (isWikipediaAPI(url.href)) {
        // Wikipedia API: Stale-while-revalidate for speed + freshness
        event.respondWith(handleWikipediaAPI(request));
    } else if (isStaticAsset(url.href)) {
        // Static assets: Cache-first for maximum speed
        event.respondWith(handleStaticAsset(request));
    } else {
        // Default: Network-first
        event.respondWith(handleDefault(request));
    }
});

// Check if URL is a Wikipedia API request
function isWikipediaAPI(url) {
    return WIKI_API_PATTERNS.some((pattern) => pattern.test(url));
}

// Check if URL is a static asset
function isStaticAsset(url) {
    return STATIC_ASSETS.some((asset) => url.endsWith(asset)) ||
           url.includes('cdnjs.cloudflare.com/ajax/libs/hypher');
}

// Handle Wikipedia API requests with stale-while-revalidate
async function handleWikipediaAPI(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Check if cached response is still valid
    if (cachedResponse) {
        const cachedDateHeader = cachedResponse.headers.get('sw-cached-date');

        // If no cache date header (shouldn't happen, but defensive), treat as fresh
        if (!cachedDateHeader) {
            console.log('[SW] Serving from cache (no date header):', request.url);
            return cachedResponse;
        }

        const cachedDate = new Date(cachedDateHeader);
        const cacheAge = Date.now() - cachedDate.getTime();
        const maxAge = request.url.includes('featured') ?
            CACHE_DURATIONS.featuredArticle :
            CACHE_DURATIONS.customArticle;

        if (cacheAge < maxAge) {
            console.log('[SW] Serving from cache (valid):', request.url);

            // Async revalidate in background if > 50% of max age
            if (cacheAge > maxAge * 0.5) {
                console.log('[SW] Background revalidating:', request.url);
                // Fire-and-forget background fetch (no event.waitUntil needed)
                fetch(request).then((response) => {
                    if (response.ok) {
                        cache.put(request, addCacheHeaders(response.clone()));
                    }
                }).catch(() => {
                    // Ignore background fetch failures
                });
            }

            return cachedResponse;
        } else {
            console.log('[SW] Cache expired, fetching fresh:', request.url);
        }
    }

    // Fetch from network
    try {
        const response = await fetch(request);

        if (response.ok) {
            console.log('[SW] Caching fresh response:', request.url);
            cache.put(request, addCacheHeaders(response.clone()));
        }

        return response;
    } catch (error) {
        console.error('[SW] Network fetch failed:', error);

        // Return stale cache if available
        if (cachedResponse) {
            console.log('[SW] Returning stale cache (offline):', request.url);
            return cachedResponse;
        }

        throw error;
    }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        console.log('[SW] Serving static asset from cache:', request.url);
        return cachedResponse;
    }

    console.log('[SW] Fetching static asset:', request.url);
    const response = await fetch(request);

    if (response.ok) {
        cache.put(request, addCacheHeaders(response.clone()));
    }

    return response;
}

// Handle other requests with network-first strategy
async function handleDefault(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Network failed, serving from cache:', request.url);
            return cachedResponse;
        }
        throw error;
    }
}

// Add custom headers to track cache date
function addCacheHeaders(response) {
    try {
        const headers = new Headers(response.headers);
        headers.set('sw-cached-date', new Date().toISOString());

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
        });
    } catch (error) {
        console.warn('[SW] Failed to add cache headers:', error);
        return response; // Return original response if headers can't be modified
    }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('[SW] Cache cleared');
                return caches.open(CACHE_NAME);
            })
        );
    }
});
