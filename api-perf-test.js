// API Performance Test Script
// Run with: node api-perf-test.js

const https = require('https');

function fetchWithTiming(url) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                resolve({
                    duration,
                    size: data.length,
                    statusCode: res.statusCode
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function runAPITests(numTests = 15) {
    console.log('🚀 Starting Wikipedia API Performance Tests\n');
    console.log(`Running ${numTests} tests (5 cached + 10 uncached)...\n`);

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const featuredUrl = `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`;

    const results = [];

    // Test 1-5: Cached responses (if server caches)
    console.log('📊 Phase 1: Initial requests (may hit CDN cache)...');
    for (let i = 1; i <= 5; i++) {
        try {
            const result = await fetchWithTiming(featuredUrl);
            results.push({
                run: i,
                type: 'initial',
                ...result
            });
            console.log(`  Run ${i}: ${result.duration}ms (${(result.size / 1024).toFixed(2)} KB)`);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`  Run ${i}: ERROR - ${error.message}`);
        }
    }

    console.log('\n📊 Phase 2: Subsequent requests (likely cached by CDN)...');
    for (let i = 6; i <= numTests; i++) {
        try {
            const result = await fetchWithTiming(featuredUrl);
            results.push({
                run: i,
                type: 'cached',
                ...result
            });
            console.log(`  Run ${i}: ${result.duration}ms (${(result.size / 1024).toFixed(2)} KB)`);
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error(`  Run ${i}: ERROR - ${error.message}`);
        }
    }

    // Calculate statistics
    console.log('\n' + '='.repeat(70));
    console.log('📈 SUMMARY STATISTICS');
    console.log('='.repeat(70));

    const durations = results.map(r => r.duration);
    const initialDurations = results.filter(r => r.type === 'initial').map(r => r.duration);
    const cachedDurations = results.filter(r => r.type === 'cached').map(r => r.duration);

    const calcStats = (data) => {
        const sorted = [...data].sort((a, b) => a - b);
        return {
            min: Math.min(...data),
            max: Math.max(...data),
            mean: data.reduce((a, b) => a + b, 0) / data.length,
            median: sorted[Math.floor(data.length / 2)],
            p95: sorted[Math.floor(data.length * 0.95)]
        };
    };

    const allStats = calcStats(durations);
    console.log('\nAll Requests:');
    console.log(`  Mean:   ${allStats.mean.toFixed(2)}ms`);
    console.log(`  Median: ${allStats.median.toFixed(2)}ms`);
    console.log(`  P95:    ${allStats.p95.toFixed(2)}ms`);
    console.log(`  Min:    ${allStats.min.toFixed(2)}ms`);
    console.log(`  Max:    ${allStats.max.toFixed(2)}ms`);

    if (initialDurations.length > 0) {
        const initialStats = calcStats(initialDurations);
        console.log('\nInitial Requests (runs 1-5):');
        console.log(`  Mean:   ${initialStats.mean.toFixed(2)}ms`);
        console.log(`  Median: ${initialStats.median.toFixed(2)}ms`);
    }

    if (cachedDurations.length > 0) {
        const cachedStats = calcStats(cachedDurations);
        console.log('\nCached Requests (runs 6-15):');
        console.log(`  Mean:   ${cachedStats.mean.toFixed(2)}ms`);
        console.log(`  Median: ${cachedStats.median.toFixed(2)}ms`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test complete!\n');

    // Export to CSV
    const csv = [
        'Run,Type,Duration (ms),Size (KB),Status',
        ...results.map(r => `${r.run},${r.type},${r.duration},${(r.size / 1024).toFixed(2)},${r.statusCode}`)
    ].join('\n');

    const fs = require('fs');
    const filename = `api-perf-results-${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(filename, csv);
    console.log(`📁 Results exported to: ${filename}\n`);
}

// Run the tests
runAPITests(15).catch(console.error);
