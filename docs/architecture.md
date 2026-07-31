# Architecture

WebChat is a Python + JavaScript hybrid. The two halves have distinct jobs:

```
┌─────────────────────────── browser ───────────────────────────┐
│  templates/index.html  +  static/js/app.js                     │
│  loads HiveMind-js V1 client (from CDN)                        │
│      JarbasHiveMind.connect(host, port, user, accessKey, pass) │
└───────────────────────────────┬───────────────────────────────┘
                                 │  encrypted WebSocket (V1)
                                 ▼
                        hivemind-core hub  ──►  OVOS / agent

┌──────────────── Python package (this repo) ───────────────────┐
│  hivemind_webchat.WebChat  — Tornado HTTPServer (serves the UI)│
│  hivemind_webchat.bridge.WebchatBridge — optional headless      │
│      HiveMessageBusClient relay to the hub (no browser)        │
└────────────────────────────────────────────────────────────────┘
```

## The Python backend

`hivemind_webchat.WebChat` is a `threading.Thread` wrapping a Tornado
`HTTPServer`. It serves:

- `templates/index.html` at `/` (the chat page), and
- the chat assets (`app.js`, css, fonts, images) under `/static`.

`hivemind-webchat --port N` (the `hivemind_webchat.__main__:main` entrypoint)
starts this server and blocks. **The HTTP server itself never connects to the
hub** — that is the browser's job.

## The JavaScript frontend

`index.html` loads the HiveMind-js **V1** client from jsDelivr and `app.js`
wires the connection form to
`JarbasHiveMind.connect(host, port, user, accessKey, password)`. The browser:

1. derives a session key from the password (PBKDF2-HMAC-SHA256),
2. completes the V1 handshake with the hub,
3. encrypts all subsequent traffic with AES-GCM (native Web Crypto — no
   `asmcrypto.js` / `webcrypto-shim.js` polyfills),
4. sends typed text as `recognizer_loop:utterance` and renders `speak` replies.

All HiveMind protocol work (handshake, encryption, routing) happens **in the
browser inside HiveMind-js**.

## The optional headless bridge

`hivemind_webchat.bridge.WebchatBridge` is a `threading.Thread` built on
`hivemind-bus-client`. It mirrors what the browser does, but in Python and
without a browser:

- `WebchatBridge(access_key=…, host=…, port=…, password=…)` builds a real
  `HiveMessageBusClient`, connects, and completes the V1 handshake.
- `bridge.say(text)` wraps a `recognizer_loop:utterance` `Message` in a
  `HiveMessage(HiveMessageType.BUS)` and emits it to the hub.
- `bridge.handle_speak(message)` is bound to the hub's `speak` and returns the
  reply utterance (a browser would paint it into the chat log).

This is the relay used by the Python end-to-end suite (a real backend over a
real `HiveMessageBusClient` against a real hub) and is opt-in via
`all_in_one/launch.py --access-key`.

## Where the monolith went

The pre-rename Mycroft-era code bundled a full core + message bus + the
`jarbas_hive_mind` listener in one process. In the modern ecosystem that
monolith is split:

- the hub is **hivemind-core** (a separate service), and
- the skills/agent is **ovos-core** (a separate service).

So WebChat keeps only the UI server + the thin client bridge and points users at
the standalone hub. Running the `all_in_one` Docker image end to end therefore
means standing up `hivemind-core` + `ovos-core` separately.

---
[← Configuration](configuration.md) · [Home](index.md) · [Deployment →](deployment.md)
