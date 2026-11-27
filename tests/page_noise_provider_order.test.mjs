/**
 * The page must expose the Noise PSK provider BEFORE the client loads.
 *
 * hivemind.js reads globalThis.HiveMindNoble on each use (the "@noble crypto"
 * block near the top of the client), so the provider must stay in place for
 * the whole life of the page. A `<script type="module">` is always deferred:
 * it runs after every classic `<script src>` in the page. So a module that
 * sets HiveMindNoble next to a classic hivemind.js tag sets it too late for
 * any code the client runs at load, and the page must not remove it later.
 *
 * The page therefore loads the client from inside the same module, after the
 * provider is set. This test reads index.html and checks that order.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE = process.env.WEBCHAT_INDEX_HTML ||
    resolve(__dirname, '..', 'hivemind_webchat', 'templates', 'index.html');
const html = readFileSync(PAGE, 'utf8');

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map(([, attrs, body]) => ({ attrs, body }));

const isModule = (s) => /\btype\s*=\s*["']module["']/i.test(s.attrs);
const srcOf = (s) => (s.attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || '';

test('no classic script tag loads hivemind.js', () => {
    const classic = scripts.filter((s) => !isModule(s) && /hivemind\.js/.test(srcOf(s)));
    assert.deepEqual(classic.map(srcOf), [],
        'a classic <script src=".../hivemind.js"> runs before any module, ' +
        'so the client reads HiveMindNoble before the provider sets it');
});

test('the module sets HiveMindNoble before it loads the client', () => {
    const modules = scripts.filter((s) => isModule(s) && /HiveMindNoble/.test(s.body));
    assert.equal(modules.length, 1, 'exactly one module script exposes the provider');
    const body = modules[0].body;
    const setAt = body.search(/globalThis\.HiveMindNoble\s*=/);
    const clientAt = body.search(/hivemind\.js/);
    assert.ok(setAt >= 0, 'the module assigns globalThis.HiveMindNoble');
    assert.ok(clientAt >= 0, 'the module loads hivemind.js itself');
    assert.ok(setAt < clientAt, 'HiveMindNoble is set before hivemind.js is loaded');
    const appAt = body.search(/static\/js\/app\.js/);
    assert.ok(appAt > clientAt, 'app.js loads after hivemind.js');
});

test('the argon2id provider is pinned to an exact release', () => {
    const m = html.match(/@noble\/hashes@([^/"']+)\/argon2\.js/);
    assert.ok(m, 'argon2id is imported from @noble/hashes');
    assert.match(m[1], /^\d+\.\d+\.\d+$/, 'exact version, no range or tag');
});

test('the chacha20poly1305 provider is pinned to an exact release', () => {
    const m = html.match(/@noble\/ciphers@([^/"']+)\/chacha\.js/);
    assert.ok(m, 'chacha20poly1305 is imported from @noble/ciphers');
    assert.match(m[1], /^\d+\.\d+\.\d+$/, 'exact version, no range or tag');
});

// The primitive names the page puts on globalThis.HiveMindNoble.
function exposedProviderNames() {
    const m = html.match(/globalThis\.HiveMindNoble\s*=\s*\{([^}]*)\}/);
    assert.ok(m, 'the page assigns an object literal to globalThis.HiveMindNoble');
    return m[1].split(',').map((s) => s.split(':')[0].trim()).filter(Boolean);
}

// Load a fresh hivemind.js that sees ONLY what the page exposes: every
// require('@noble/...') fallback is blocked, so Node's installed packages
// cannot fill in a primitive the browser page would not have.
async function clientWithPageProvider() {
    const require = createRequire(import.meta.url);
    const clientPath = process.env.HIVEMIND_JS_PATH ||
        resolve(__dirname, 'vendor', 'hivemind.js');
    assert.ok(existsSync(clientPath),
        `hivemind.js not found at ${clientPath}; set HIVEMIND_JS_PATH`);
    const real = {
        argon2id: (await import('@noble/hashes/argon2.js')).argon2id,
        chacha20poly1305: (await import('@noble/ciphers/chacha.js')).chacha20poly1305,
    };
    const provider = {};
    for (const name of exposedProviderNames()) {
        assert.ok(name in real, `unknown provider name on the page: ${name}`);
        provider[name] = real[name];
    }
    delete require.cache[clientPath];
    globalThis.HiveMindNoble = provider;
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function (id, ...rest) {
        if (id.startsWith('@noble/')) {
            throw new Error(`blocked for test: ${id} (the page exposes no ${id})`);
        }
        return originalRequire.call(this, id, ...rest);
    };
    try {
        return require(clientPath);
    } finally {
        Module.prototype.require = originalRequire;
    }
    // The provider stays on globalThis, as it does on the page: the client
    // reads it on each use. Each caller removes it when it is done.
}

test('with the page provider the client offers both Noise suites', async () => {
    const hm = await clientWithPageProvider();
    try {
        // ChaChaPoly is the suite every hub MUST support (HIVEMIND-CRYPTO-1 §3.1).
        // A page that offers only AES-GCM shares no suite with a ChaChaPoly-only
        // hub.
        assert.deepEqual(hm.NOISE_SUITES_JS,
            ['25519_ChaChaPoly_SHA256', '25519_AESGCM_SHA256']);
    } finally {
        delete globalThis.HiveMindNoble;
    }
});
