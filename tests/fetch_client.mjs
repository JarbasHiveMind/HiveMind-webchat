#!/usr/bin/env node
/**
 * Vendor the HiveMind-js V1 client into tests/vendor/hivemind.js so the e2e
 * test can `require` it without a sibling checkout (used by CI).
 *
 * Source of truth is the same CDN URL the webchat page loads in production,
 * so the test exercises the exact client shipped to browsers.
 */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLIENT_URL = process.env.HIVEMIND_JS_URL ||
    'https://cdn.jsdelivr.net/gh/JarbasHiveMind/HiveMind-js@dev/static/js/hivemind.js';

async function main() {
    console.log(`[*] Fetching ${CLIENT_URL}`);
    const res = await fetch(CLIENT_URL);
    if (!res.ok) {
        console.error(`[E] fetch failed: HTTP ${res.status}`);
        process.exit(1);
    }
    const body = await res.text();
    const outDir = resolve(__dirname, 'vendor');
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, 'hivemind.js');
    writeFileSync(outPath, body);
    console.log(`[+] Wrote ${outPath} (${body.length} bytes)`);
}

main();
