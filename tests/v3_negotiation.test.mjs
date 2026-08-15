/**
 * Protocol-v3 (Noise) negotiation test for the browser client.
 *
 * The loopback hub used by e2e.mjs floors an older HiveMind stack that predates
 * the v3 AES-GCM Noise suite, so full v3-over-the-wire cannot yet be exercised
 * end to end. This test instead drives the *browser client's* v3 negotiation
 * logic directly — the exact code path app.js triggers when it passes the
 * connect() options object — against synthetic ServerHello
 * payloads, proving:
 *
 *   1. the client selects the AES-GCM Noise suite a browser can actually run
 *      (Web Crypto has no ChaChaPoly),
 *   2. against a PBKDF2-KDF v3 hub the password alone yields a valid 32-byte PSK,
 *   3. against an argon2id v3 hub with no provisioned PSK it declines v3 and
 *      falls back to the legacy handshake (returns null),
 *   4. a provisioned PSK is honoured regardless of the server KDF.
 *
 * Runs headless on Node's Web Crypto (globalThis.crypto.subtle) — no browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function resolveHivemindJs() {
    if (process.env.HIVEMIND_JS_PATH) return resolve(process.env.HIVEMIND_JS_PATH);
    try {
        return require.resolve('hivemind-js');
    } catch {
        const sibling = resolve(
            __dirname, '..', '..', 'HiveMind-js', 'static', 'js', 'hivemind.js');
        if (existsSync(sibling)) return sibling;
        throw new Error('hivemind-js not found. Set HIVEMIND_JS_PATH.');
    }
}

const hm = require(resolveHivemindJs());
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

test('selectNoiseOptions picks the AES-GCM suite the browser can run', () => {
    const sel = selectNoiseOptions(
        ['XXpsk2', 'KKpsk0'],
        ['25519_ChaChaPoly_SHA256', '25519_AESGCM_SHA256'],
        null);
    assert.ok(sel, 'a mutual pattern/suite must be selected');
    assert.equal(sel.suite, '25519_AESGCM_SHA256');
    assert.equal(sel.pattern, 'XXpsk2');
    assert.deepEqual(NOISE_SUITES_JS, ['25519_AESGCM_SHA256']);
});

test('selectNoiseOptions declines a ChaChaPoly-only server', () => {
    const sel = selectNoiseOptions(['XXpsk2'], ['25519_ChaChaPoly_SHA256'], null);
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

test('argon2id hub with no provisioned PSK falls back to legacy (null)', async () => {
    const c = new JarbasHiveMind();
    c._maxProtocolVersion = 3;
    c._password = PASSWORD;
    c._serverNodeId = NODE_ID;

    const hello = pbkdf2Hello();
    hello.noise.kdf = { name: 'argon2id' };   // Web Crypto cannot compute this
    const psk = await c._resolveNoisePsk(hello);
    assert.equal(psk, null, 'must decline v3 and fall back to legacy');
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
