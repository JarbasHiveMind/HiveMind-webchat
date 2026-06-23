# HiveMind WebChat

![logo](./javascript.png)

A browser-based WebChat terminal for [HiveMind](https://github.com/JarbasHiveMind/HiveMind-core).
It serves a small chat page from a local web server; the page connects to a
HiveMind hub as a satellite using the [HiveMind-js](https://github.com/JarbasHiveMind/HiveMind-js)
client, so you can talk to your voice assistant from any browser on the network.

![webchat](./webchat.png)

## Where it sits

HiveMind is a mesh: satellite devices connect to a central
[hivemind-core](https://github.com/JarbasHiveMind/HiveMind-core) hub over an
authenticated, encrypted protocol. WebChat is one such satellite — a text
front end. The Python package here is only a static web server (Tornado); the
actual HiveMind connection runs in the browser via HiveMind-js. You point the
page at a running hub and enter the access key that hub issued you.

```
browser (this page + HiveMind-js)  ──websocket──►  hivemind-core hub  ──►  OVOS / agent
```

## Install

```bash
pip install hivemind-webchat
```

Or from source:

```bash
git clone https://github.com/JarbasHiveMind/HiveMind-webchat
cd HiveMind-webchat
pip install .
```

The only runtime dependency is `tornado`.

## Quickstart

### 1. Run a hub and issue an access key

On the machine that will host the assistant, install and run
[hivemind-core](https://github.com/JarbasHiveMind/HiveMind-core), then add a
client for the webchat:

```bash
hivemind-core add-client
# note the printed access key and password/encryption key
hivemind-core listen --port 5678
```

### 2. Start the WebChat server

```bash
hivemind-webchat --port 9090
```

This serves the chat page at `http://localhost:9090`. The port here is the web
server's HTTP port, not the hub port.

### 3. Connect from the browser

Open `http://localhost:9090`, fill in the connection form, and click
**Connect to HiveMind**:

| Field | Value |
|-------|-------|
| Host / IP | the hub's address (e.g. `127.0.0.1`) |
| Port | the hub's HiveMind port (default `5678`) |
| Access Key | the key from `hivemind-core add-client` |
| Password | the shared password for that client |

Once the handshake completes, type a message and it is sent to the hub as a
`recognizer_loop:utterance`; spoken replies are rendered back in the chat log.

The browser speaks **HiveMind Protocol V1**: the password drives a
PBKDF2-HMAC-SHA256 handshake that derives an AES-GCM session key, so all traffic
after the handshake is encrypted end to end. This runs entirely in the browser
via [HiveMind-js](https://github.com/JarbasHiveMind/HiveMind-js) using native
Web Crypto — no crypto polyfills are loaded.

## Command-line options

```
usage: hivemind-webchat [-h] [--port PORT]

Start HiveMind WebChat

options:
  -h, --help   show this help message and exit
  --port PORT  HTTP port to serve the webchat on (default 9090)
```

## How it works

- `hivemind_webchat.WebChat` is a `threading.Thread` wrapping a Tornado
  `HTTPServer`. It serves `templates/index.html` at `/` and the chat assets
  under `/static`.
- `index.html` loads the HiveMind-js V1 client from jsDelivr and `app.js` wires
  the connection form to
  `JarbasHiveMind.connect(host, port, user, accessKey, password)`.
- All HiveMind traffic (V1 handshake, encryption, message routing) happens in
  the browser inside HiveMind-js — the Python side never touches the hub.

## Tests

`tests/test_smoke.py` covers the Python web server and the optional headless
bridge. `tests/e2e.mjs` is a Node end-to-end test that loads the exact
HiveMind-js client the page ships, connects to a real loopback hivemind-core
hub (`tests/hub_fixture.py`), performs the V1 handshake, and verifies the hub
decrypts and receives an encrypted utterance:

```bash
npm install   # ws
npm test      # node tests/e2e.mjs  (needs python with hivescope + hivemind-core)
```

## Security

The Tornado server is plain HTTP and out of scope for hardening here. For any
non-local exposure, put it behind a reverse proxy (nginx, Caddy) with TLS, for
example via [Let's Encrypt](https://letsencrypt.org/). The HiveMind connection
itself is always encrypted end to end between the browser and the hub,
independent of how this page is served.

## Online demo

A static build is published from the `gh-pages` branch:
<https://jarbashivemind.github.io/HiveMind-webchat>. It is the same page served
by this server, pointed at whatever hub you enter.

## Credits

Original WebChat UI: [jcasoft](https://github.com/jcasoft/external-services).

## License

Apache 2.0 — see [LICENSE](./LICENSE).
