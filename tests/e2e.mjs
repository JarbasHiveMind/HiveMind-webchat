#!/usr/bin/env node
/**
 * End-to-end test: the HiveMind-js V1 browser client (the exact file this
 * webchat page loads) talks to a real loopback hivemind-core hub.
 *
 * Flow:
 *   1. spawn tests/hub_fixture.py  -> a real loopback hivemind-core master
 *   2. read the hub URL + credentials it prints
 *   3. load HiveMind-js, polyfill globalThis.WebSocket with `ws`
 *   4. connect() -> full V1 handshake (PBKDF2 key derivation + AES-GCM)
 *   5. sendUtterance() -> encrypted bus message
 *   6. ask the hub fixture to confirm it received the utterance
 *
 * The client is loaded from (first that exists):
 *   - $HIVEMIND_JS_PATH                      (explicit override)
 *   - ../../HiveMind-js/static/js/hivemind.js (sibling checkout)
 *   - tests/vendor/hivemind.js                (vendored copy, fetched in CI)
 *
 * Usage: node tests/e2e.mjs
 * Env:   PYTHON=python  (interpreter that has hivescope/hivemind-core)
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Polyfill the browser WebSocket the client expects ─────────────────────────
const WebSocket = require('ws');
globalThis.WebSocket = WebSocket;

// ── Locate (or fetch) the HiveMind-js client ──────────────────────────────────
// Source of truth is the same CDN URL the webchat page loads in production, so
// the test exercises the exact client shipped to browsers.
const CLIENT_URL = process.env.HIVEMIND_JS_URL ||
    'https://cdn.jsdelivr.net/gh/JarbasHiveMind/HiveMind-js@dev/static/js/hivemind.js';

async function resolveClientPath() {
    const candidates = [
        process.env.HIVEMIND_JS_PATH,
        resolve(__dirname, '../../HiveMind-js/static/js/hivemind.js'),
        resolve(__dirname, 'vendor/hivemind.js'),
    ].filter(Boolean);
    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    // No local copy — vendor it from the CDN (CI path).
    console.log(`[*] No local client found; fetching ${CLIENT_URL}`);
    const res = await fetch(CLIENT_URL);
    if (!res.ok) throw new Error(`fetch client failed: HTTP ${res.status}`);
    const body = await res.text();
    const outDir = resolve(__dirname, 'vendor');
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, 'hivemind.js');
    writeFileSync(outPath, body);
    return outPath;
}

const clientPath = await resolveClientPath();
const { JarbasHiveMind } = require(clientPath);
console.log(`[*] Loaded HiveMind-js client from ${clientPath}`);

const PYTHON = process.env.PYTHON || 'python3';
const HANDSHAKE_TIMEOUT = 20000;

function fail(msg) {
    console.error(`[E] Test FAILED: ${msg}`);
    process.exitCode = 1;
}

async function main() {
    // 1. Spawn the loopback hub fixture.
    const fixturePath = resolve(__dirname, 'hub_fixture.py');
    const hub = spawn(PYTHON, [fixturePath], {
        stdio: ['pipe', 'pipe', 'inherit'],
    });

    // The hub fixture prefixes its machine-readable lines with this sentinel
    // so they can be picked out of hivemind-core's stdout logging.
    const SENTINEL = '@@HUB@@ ';
    const hubLines = readline.createInterface({ input: hub.stdout });
    const lineQueue = [];
    const lineWaiters = [];
    hubLines.on('line', (line) => {
        const idx = line.indexOf(SENTINEL);
        if (idx === -1) return;
        const t = line.slice(idx + SENTINEL.length).trim();
        if (!t) return;
        if (lineWaiters.length) lineWaiters.shift()(t);
        else lineQueue.push(t);
    });
    const nextHubLine = (timeoutMs) => new Promise((res, rej) => {
        if (lineQueue.length) return res(lineQueue.shift());
        const timer = setTimeout(() => rej(new Error('hub fixture timeout')), timeoutMs);
        lineWaiters.push((l) => { clearTimeout(timer); res(l); });
    });

    let hubExited = false;
    hub.on('exit', () => { hubExited = true; });

    try {
        // 2. Read the hub's URL + credentials.
        const info = JSON.parse(await nextHubLine(HANDSHAKE_TIMEOUT));
        const url = new URL(info.url);
        const host = url.hostname;
        const port = parseInt(url.port, 10) || 5678;
        console.log(`[*] Hub ready at ${host}:${port} (sat=${info.name})`);

        // 3-5. Connect, handshake, send an utterance.
        const client = new JarbasHiveMind();
        const UTTERANCE = 'hello from the webchat browser client';

        const connected = new Promise((res, rej) => {
            const timer = setTimeout(
                () => rej(new Error('handshake timeout')), HANDSHAKE_TIMEOUT);
            client.onHiveConnected = () => { clearTimeout(timer); res(); };
            client.onHiveDisconnected = () =>
                rej(new Error('disconnected during handshake'));
        });

        client.connect(host, port, info.name, info.key, info.password);
        await connected;
        console.log('[+] V1 handshake complete (key derived, channel encrypted)');

        await client.sendUtterance(UTTERANCE);
        console.log(`[*] Sent encrypted utterance: "${UTTERANCE}"`);

        // Give the hub a moment to decrypt + inject the bus message.
        await new Promise((r) => setTimeout(r, 1500));

        // 6. Ask the hub to confirm receipt.
        hub.stdin.write('check\n');
        const report = JSON.parse(await nextHubLine(HANDSHAKE_TIMEOUT));
        if (report.utterances > 0) {
            console.log(
                `[+] Test PASSED: hub decrypted and injected ` +
                `${report.utterances} utterance(s) from the JS client`);
        } else {
            fail('hub received 0 utterances from the JS client');
        }

        try { client.ws.close(); } catch (_) {}
    } catch (err) {
        fail(err.message);
    } finally {
        try { hub.stdin.write('stop\n'); } catch (_) {}
        if (!hubExited) hub.kill('SIGTERM');
    }
}

main();
