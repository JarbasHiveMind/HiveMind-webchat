/**
 * Protocol-v3 (Noise) negotiation test for the browser client.
 *
 * The loopback hub used by e2e.mjs floors an older HiveMind stack that predates
 * the v3 AES-GCM Noise suite, so full v3-over-the-wire cannot yet be exercised
 * end to end. This test instead drives the *browser client's* v3 negotiation
 * logic directly — the exact code path app.js triggers when it passes the
 * connect() options object — against synthetic ServerHello payloads.
 *
 * hivemind.js resolves its ChaCha20-Poly1305/argon2id backend once, at module
 * load, from globalThis.HiveMindNoble or a require('@noble/...') fallback
 * (see the "@noble crypto" block near the top of the client). A browser
 * bundle that ships without @noble is a real, supported deployment shape —
 * the client degrades to Web-Crypto-only AES-GCM + PBKDF2 — and it behaves
 * differently from a bundle (or this repo's own devDependencies) that has
 * @noble available. Both worlds are exercised here by loading a fresh copy
 * of the client per world: loadClient(false) blocks require('@noble/...') so
 * the module falls through to the Web-Crypto-only degraded mode regardless
 * of what is actually installed; loadClient(true) lets the real install
 * resolve. This proves:
 *
 *   1. WITHOUT @noble: the client selects the AES-GCM Noise suite (Web
 *      Crypto has no ChaChaPoly), and declines a ChaChaPoly-only server.
 *   2. WITHOUT @noble: against an argon2id v3 hub with no provisioned PSK it
 *      declines v3 and falls back to the legacy handshake (returns null).
 *   3. WITH @noble: the client prefers ChaChaPoly, accepts a ChaChaPoly-only
 *      server, and derives the same argon2id PSK as the hub with no
 *      provisioned secret and no PBKDF2 fallback needed.
 *   4. Regardless of @noble: a PBKDF2-KDF hub and a provisioned PSK behave
 *      the same, and a v1-only hub never yields a PSK.
 *
 * Runs headless on Node's Web Crypto (globalThis.crypto.subtle) — no browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Same CDN URL tests/fetch_client.mjs and tests/e2e.mjs pull from, so a plain
// `npm install && npm test` (the README quickstart) works without a sibling
// HiveMind-js checkout or a manual `npm run fetch-client` first.
const CLIENT_URL = process.env.HIVEMIND_JS_URL ||
    'https://cdn.jsdelivr.net/gh/JarbasHiveMind/HiveMind-js@dev/static/js/hivemind.js';

async function resolveHivemindJs() {
    if (process.env.HIVEMIND_JS_PATH) return resolve(process.env.HIVEMIND_JS_PATH);
    try {
        return require.resolve('hivemind-js');
    } catch {
        const sibling = resolve(
            __dirname, '..', '..', 'HiveMind-js', 'static', 'js', 'hivemind.js');
        if (existsSync(sibling)) return sibling;
        const vendored = resolve(__dirname, 'vendor', 'hivemind.js');
        if (existsSync(vendored)) return vendored;
        console.log(`[*] No local client found; fetching ${CLIENT_URL}`);
        const res = await fetch(CLIENT_URL);
        if (!res.ok) {
            throw new Error(
                `hivemind-js not found and fetch failed: HTTP ${res.status}. Set HIVEMIND_JS_PATH.`);
        }
        const body = await res.text();
        const outDir = resolve(__dirname, 'vendor');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(vendored, body);
        return vendored;
    }
}

const clientPath = await resolveHivemindJs();

// Load a fresh, uncached copy of hivemind.js with the @noble backend forced
// to a specific state, regardless of what is actually installed. The
// module's own require() calls run through Module.prototype.require, so
// blocking that for the '@noble/*' specifiers reproduces the "bundle without
// @noble" browser deployment even when this repo's devDependencies (needed
// by e2e.mjs) provide the real packages.
function loadClient(withNoble) {
    delete require.cache[clientPath];
    delete globalThis.HiveMindNoble;
    const originalRequire = Module.prototype.require;
    if (!withNoble) {
        Module.prototype.require = function (id, ...rest) {
            if (id.startsWith('@noble/')) {
                throw new Error(`blocked for test: ${id} (simulating a bundle without @noble)`);
            }
            return originalRequire.call(this, id, ...rest);
        };
    }
    try {
        return require(clientPath);
    } finally {
        Module.prototype.require = originalRequire;
    }
}

const NODE_ID = 'HiveMind-Node';
const PASSWORD = 'super secret hive password';

// A v3 ServerHello advertising both Noise suites and both patterns, with the
// PBKDF2 PSK KDF — the config a browser peer can fully interoperate with
// whether or not @noble is loaded.
function pbkdf2Hello() {
    return {
        node_id: NODE_ID,
        max_protocol_version: 3,
        noise: {
            patterns: ['XXpsk2', 'KKpsk0'],
            suites: ['25519_ChaChaPoly_SHA256', '25519_AESGCM_SHA256'],
            kdf: { name: 'PBKDF2', iterations: 100000 },
        },
    };
}

function newClient(hm) {
    const c = new hm.JarbasHiveMind();
    c._maxProtocolVersion = 3;
    c._password = PASSWORD;
    c._serverNodeId = NODE_ID;
    return c;
}

// ── Without @noble (minimal browser bundle) ────────────────────────────────

test('without @noble: selectNoiseOptions picks the AES-GCM suite the browser can run', () => {
    const hm = loadClient(false);
    const sel = hm.selectNoiseOptions(
        ['XXpsk2', 'KKpsk0'],
        ['25519_ChaChaPoly_SHA256', '25519_AESGCM_SHA256'],
        null);
    assert.ok(sel, 'a mutual pattern/suite must be selected');
    assert.equal(sel.suite, '25519_AESGCM_SHA256');
    assert.equal(sel.pattern, 'XXpsk2');
    assert.deepEqual(hm.NOISE_SUITES_JS, ['25519_AESGCM_SHA256']);
});

test('without @noble: selectNoiseOptions declines a ChaChaPoly-only server', () => {
    const hm = loadClient(false);
    const sel = hm.selectNoiseOptions(['XXpsk2'], ['25519_ChaChaPoly_SHA256'], null);
    assert.equal(sel, null);
});

test('without @noble: argon2id hub with no provisioned PSK falls back to legacy (null)', async () => {
    const hm = loadClient(false);
    const c = newClient(hm);
    const hello = pbkdf2Hello();
    hello.noise.kdf = { name: 'argon2id' };   // Web Crypto cannot compute this
    const psk = await c._resolveNoisePsk(hello);
    assert.equal(psk, null, 'must decline v3 and fall back to legacy');
});

// ── With @noble (full bundle, matches this repo's own devDependencies) ────

test('with @noble: selectNoiseOptions prefers ChaChaPoly and accepts a ChaChaPoly-only server', () => {
    const hm = loadClient(true);
    assert.deepEqual(hm.NOISE_SUITES_JS, ['25519_ChaChaPoly_SHA256', '25519_AESGCM_SHA256']);

    const sel = hm.selectNoiseOptions(
        ['XXpsk2', 'KKpsk0'],
        ['25519_ChaChaPoly_SHA256', '25519_AESGCM_SHA256'],
        null);
    assert.equal(sel.suite, '25519_ChaChaPoly_SHA256');

    const chachaOnly = hm.selectNoiseOptions(['XXpsk2'], ['25519_ChaChaPoly_SHA256'], null);
    assert.ok(chachaOnly, 'a ChaChaPoly-only server must now be accepted');
});

test('with @noble: password derives the server DEFAULT argon2id PSK with no provisioning', async () => {
    const hm = loadClient(true);
    const c = newClient(hm);
    const hello = pbkdf2Hello();
    hello.noise.kdf = { name: 'argon2id' };
    const psk = await c._resolveNoisePsk(hello);
    assert.ok(psk instanceof Uint8Array, 'a PSK must be resolved');
    assert.equal(psk.length, 32);

    const expected = await hm.derivePskArgon2(PASSWORD, NODE_ID);
    assert.deepEqual([...psk], [...expected]);
});

// ── Independent of @noble ───────────────────────────────────────────────────

for (const withNoble of [false, true]) {
    const label = withNoble ? 'with @noble' : 'without @noble';

    test(`${label}: password derives a valid v3 PSK against a PBKDF2-KDF hub`, async () => {
        const hm = loadClient(withNoble);
        const c = newClient(hm);

        const psk = await c._resolveNoisePsk(pbkdf2Hello());
        assert.ok(psk instanceof Uint8Array, 'a PSK must be resolved');
        assert.equal(psk.length, 32);

        // It must equal the spec derivation PBKDF2(password, SHA-256(node_id)),
        // regardless of whether argon2id is also available.
        const expected = await hm.derivePskPBKDF2(PASSWORD, NODE_ID, 100000);
        assert.deepEqual([...psk], [...expected]);
    });

    test(`${label}: a provisioned PSK is honoured regardless of server KDF`, async () => {
        const hm = loadClient(withNoble);
        const c = newClient(hm);
        c._psk = new Uint8Array(32).fill(7);

        const hello = pbkdf2Hello();
        hello.noise.kdf = { name: 'argon2id' };
        const psk = await c._resolveNoisePsk(hello);
        assert.ok(psk instanceof Uint8Array);
        assert.deepEqual([...psk], [...c._psk]);
    });

    test(`${label}: a v1-only hub yields no PSK (pure legacy path)`, async () => {
        const hm = loadClient(withNoble);
        const c = newClient(hm);

        const psk = await c._resolveNoisePsk({ node_id: NODE_ID, max_protocol_version: 1 });
        assert.equal(psk, null);
    });
}
