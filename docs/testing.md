# Testing

WebChat is a Python + JavaScript hybrid, so it has **two** test suites, one for
each half. There is a single Python test directory (`tests/`, with the e2e suite
under `tests/e2e/`). There are no `importorskip` / `skipif` guards. The full
HiveMind 2.x stack is a hard `[e2e]` dependency.

## Python tests

```bash
uv pip install -e ".[e2e]"
pytest tests/
```

- `tests/test_smoke.py`: import, version, Tornado server construction without
  binding a socket, and bridge construction with a mocked client (no connect).
- `tests/e2e/`: the real end-to-end suite below.

### Python e2e: real backend over a real hub

`tests/e2e/test_webchat_hivemind_e2e.py` boots a **real `hivemind-core` master
in-process** (via the [hivescope](https://github.com/JarbasHiveMind/hivescope)
loopback hub) and drives the webchat's **real** `WebchatBridge` over a **real
`HiveMessageBusClient`** across a localhost WebSocket. Only the **browser /
websocket frontend** is mocked. The browser does not run, so user input is
injected by calling the bridge's `say()` (exactly what `app.js` does on the
wire) and rendered `speak` replies are captured from `handle_speak` instead of
being painted into the DOM.

| Test | Path exercised |
|---|---|
| `test_chat_message_reaches_hub_as_utterance` | (mocked browser) text → real `WebchatBridge.say()` → real hub decrypts + injects `recognizer_loop:utterance` on the agent bus |
| `test_bridge_constructs_with_real_handshake` | Real bridge builds a real `HiveMessageBusClient`, handshakes with the hub, binds its `speak` handler |
| `test_speak_response_routed_back_to_webchat` | Hub agent `speak` routed to the peer → real `handle_speak` → rendered back to the (mocked) browser chat log |
| `test_full_chat_roundtrip` | Full loop: message browser → bridge → hub, the hub answers with a `speak` routed back → bridge → browser |

Everything between the backend and the hub (the bridge, encryption, the
`HiveMessageBusClient`, the WebSocket transport, the `hivemind-core` listener,
agent bus, and reverse routing) is genuine production code.

## JavaScript e2e: real browser client over a real hub

```bash
npm install   # ws (the only dev-dependency)
npm test      # node tests/e2e.mjs
```

`tests/e2e.mjs` loads the **exact** HiveMind-js V1 client the page ships (sibling
checkout if present, else fetched from the same CDN URL used in production),
polyfills `globalThis.WebSocket` with `ws`, spawns a real loopback
`hivemind-core` hub (`tests/hub_fixture.py` via hivescope), runs the full V1
handshake (PBKDF2 + AES-GCM), sends an encrypted utterance, and asserts the hub
decrypts and injects it. This needs a Python interpreter with the `[e2e]` stack
on `PATH` (`PYTHON=...` overrides it).

This is the **browser-side** round-trip the Python suite intentionally mocks: the
two suites together cover both halves of the hybrid.

## CI

| Workflow | Covers |
|---|---|
| `build_tests.yml` | Build + clean-install across Python 3.10–3.13 (`install_extras: e2e`), plus the smoke tests |
| `e2e_tests.yml` | The Python e2e suite (`tests/e2e/`) against a real loopback hub, single Python |
| `js_e2e_tests.yml` | The Node JS e2e (`npm test`) against a real loopback hub |
| `coverage.yml` | Coverage of `hivemind_webchat` |
| `lint.yml` | Ruff |
| `license_tests.yml`, `pip_audit.yml`, `release_preview.yml`, `repo_health.yml` | License / vuln / release / health checks |

All Python CI uses the shared `OpenVoiceOS/gh-automations` reusable workflows
`@dev`.

---
[← Dependencies](dependencies.md) · [Home](index.md) · [Troubleshooting →](troubleshooting.md)
