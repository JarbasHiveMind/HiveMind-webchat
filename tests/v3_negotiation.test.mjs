/**
 * Protocol-v3 (Noise) negotiation test for the browser client.
 *
 * This test drives the client's v3 negotiation logic directly — the exact code
 * path app.js triggers when it passes the connect() options object — against
 * synthetic ServerHello payloads, proving:
 *
 *   1. selectNoiseOptions picks AES-GCM, the only suite the shipped page can
 *      run (index.html loads only @noble/hashes for argon2id, never
 *      @noble/ciphers, so NOISE_SUITES_JS never contains ChaChaPoly here),
 *   2. it declines a server offering no suite the client supports,
 *   3. against a PBKDF2-KDF v3 hub the password alone yields a valid 32-byte
 *      PSK, matching an independent PBKDF2 derivation,
 *   4. against an argon2id v3 hub with no provisioned PSK it derives a PSK
 *      matching an independent argon2id derivation called directly from
 *      @noble/hashes with the spec-fixed parameters,
 *   5. a provisioned PSK is honoured regardless of the server KDF.
 *
 * Runs headless on Node (require() fallback) — no browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { argon2id } from '@noble/hashes/argon2.js';

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

// Mirror index.html's browser provider exactly: expose argon2id (and only
// argon2id, never chacha20poly1305) on globalThis.HiveMindNoble before the
// client loads, instead of relying on Node's require() fallback — the
// shipped page never has @noble/ciphers, so this is what a real browser sees.
globalThis.HiveMindNoble = { argon2id };

const hm = require(await resolveHivemindJs());
const { JarbasHiveMind, selectNoiseOptions, derivePskPBKDF2, NOISE_SUITES_JS } = hm;

const NODE_ID = 'HiveMind-Node';
const PASSWORD = 'super secret hive password';

// A v3 ServerHello advertising both Noise suites and both patterns, with the
// PBKDF2 PSK KDF — the config a browser peer can fully interoperate with.
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

test('selectNoiseOptions picks the AES-GCM suite the shipped page can run', () => {
    const sel = selectNoiseOptions(
        ['XXpsk2', 'KKpsk0'],
        ['25519_ChaChaPoly_SHA256', '25519_AESGCM_SHA256'],
        null);
    assert.ok(sel, 'a mutual pattern/suite must be selected');
    assert.equal(sel.suite, '25519_AESGCM_SHA256');
    assert.equal(sel.pattern, 'XXpsk2');
    assert.deepEqual(NOISE_SUITES_JS, ['25519_AESGCM_SHA256']);
});

test('selectNoiseOptions declines a server offering no mutual suite', () => {
    const sel = selectNoiseOptions(['XXpsk2'], ['unsupported-suite'], null);
    assert.equal(sel, null);
});

test('password derives a valid v3 PSK against a PBKDF2-KDF hub', async () => {
    const c = new JarbasHiveMind();
    c._maxProtocolVersion = 3;
    c._password = PASSWORD;
    c._serverNodeId = NODE_ID;

    const psk = await c._resolveNoisePsk(pbkdf2Hello());
    assert.ok(psk instanceof Uint8Array, 'a PSK must be resolved');
    assert.equal(psk.length, 32);

    // It must equal the spec derivation PBKDF2(password, SHA-256(node_id)).
    const expected = await derivePskPBKDF2(PASSWORD, NODE_ID, 100000);
    assert.deepEqual([...psk], [...expected]);
});

test('password derives a valid v3 PSK against an argon2id-KDF hub', async () => {
    const c = new JarbasHiveMind();
    c._maxProtocolVersion = 3;
    c._password = PASSWORD;
    c._serverNodeId = NODE_ID;

    const hello = pbkdf2Hello();
    hello.noise.kdf = { name: 'argon2id' };
    const psk = await c._resolveNoisePsk(hello);
    assert.ok(psk instanceof Uint8Array, 'a PSK must be resolved');
    assert.equal(psk.length, 32);

    // Independent oracle: call @noble/hashes' argon2id directly with the
    // spec-fixed parameters (HIVEMIND-CRYPTO-1 §3), not the client's own
    // derivePskArgon2 (which _resolveNoisePsk itself calls, and so cannot
    // catch a wrong parameter choice there).
    const salt = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(NODE_ID)));
    const expected = argon2id(new TextEncoder().encode(PASSWORD), salt,
        { t: 3, m: 64 * 1024, p: 1, dkLen: 32 });
    assert.deepEqual([...psk], [...expected]);
});

test('a provisioned PSK is honoured regardless of server KDF', async () => {
    const c = new JarbasHiveMind();
    c._maxProtocolVersion = 3;
    c._password = PASSWORD;
    c._serverNodeId = NODE_ID;
    c._psk = new Uint8Array(32).fill(7);

    const hello = pbkdf2Hello();
    hello.noise.kdf = { name: 'argon2id' };
    const psk = await c._resolveNoisePsk(hello);
    assert.ok(psk instanceof Uint8Array);
    assert.deepEqual([...psk], [...c._psk]);
});

test('a v1-only hub yields no PSK (pure legacy path)', async () => {
    const c = new JarbasHiveMind();
    c._maxProtocolVersion = 3;
    c._password = PASSWORD;
    c._serverNodeId = NODE_ID;

    const psk = await c._resolveNoisePsk({ node_id: NODE_ID, max_protocol_version: 1 });
    assert.equal(psk, null);
});
