# HiveMind WebChat Documentation

**HiveMind WebChat** is a browser-based text terminal for
[HiveMind](https://github.com/JarbasHiveMind/HiveMind-core). It is a hybrid of
two pieces:

- a small **Python backend** (Tornado) that serves a static chat page, and
- a **JavaScript frontend** that runs in the browser and connects to a
  HiveMind hub directly via the [HiveMind-js](https://github.com/JarbasHiveMind/HiveMind-js)
  V1 client (PBKDF2-HMAC-SHA256 handshake + AES-GCM encryption, native Web
  Crypto).

You type a message in the browser, it is sent to the hub as a
`recognizer_loop:utterance`, and spoken replies are rendered back in the chat
log. The Python package also ships an **optional headless bridge**
(`WebchatBridge`, built on `hivemind-bus-client`) for server-side relay and
testing without a browser.

```
browser (this page + HiveMind-js)  ──websocket──►  hivemind-core hub  ──►  OVOS / agent
                                                          ▲
optional headless WebchatBridge (Python) ──HiveMessageBusClient──┘
```

---

## Satellite spectrum: where does WebChat sit?

HiveMind is a mesh: satellite devices connect to a central
[hivemind-core](https://github.com/JarbasHiveMind/HiveMind-core) hub over an
authenticated, encrypted protocol. WebChat is a **text** front end. It has no
audio and no local models.

| Satellite | Input | Output | Best for |
|---|---|---|---|
| **HiveMind-webchat** (this repo) | text (browser) | text (browser) | Chat from any browser on the network |
| [HiveMind-cli](https://github.com/JarbasHiveMind/HiveMind-cli) | text (keyboard/script) | text | Terminal / scripting |
| [hivemind-mic-satellite](https://github.com/JarbasHiveMind/hivemind-mic-satellite) | mic (server STT) | speaker | Cheapest voice HW |
| [HiveMind-voice-sat](https://github.com/JarbasHiveMind/HiveMind-voice-sat) | mic (local STT) | speaker | Full local voice stack |

---

## Pages

- [Getting started](getting-started.md): prerequisites, install, pairing, first run
- [Configuration](configuration.md): CLI flags, connection form, the optional bridge
- [Architecture](architecture.md): the Python backend, the JS frontend, the bridge, the protocol
- [Deployment](deployment.md): reverse proxy / TLS, Docker, the gh-pages static demo
- [Dependencies](dependencies.md): runtime + e2e deps and the bus-client 2.x story
- [Testing](testing.md): the Python e2e + JS e2e suites, how the frontend is mocked, running both
- [Troubleshooting](troubleshooting.md): common failure modes and fixes

---

## Quick links

- [GitHub repository](https://github.com/JarbasHiveMind/HiveMind-webchat)
- [PyPI package](https://pypi.org/project/hivemind-webchat/)
- [Online demo](https://jarbashivemind.github.io/HiveMind-webchat)
- [HiveMind-core](https://github.com/JarbasHiveMind/HiveMind-core)
- [HiveMind-js](https://github.com/JarbasHiveMind/HiveMind-js) (the browser client)
