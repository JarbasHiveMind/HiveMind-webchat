# Configuration

WebChat has very little to configure: the Python backend takes one flag (the
HTTP port), and the HiveMind connection details are entered in the browser.

## CLI flags — `hivemind-webchat`

```
usage: hivemind-webchat [-h] [--port PORT]

Start HiveMind WebChat

options:
  -h, --help   show this help message and exit
  --port PORT  HTTP port to serve the webchat on (default 9090)
```

`--port` is the **web server's HTTP port** (where the browser loads the page),
not the hub's HiveMind port.

## Browser connection form

The connection to the hub is configured in the browser, not on the server. The
page presents:

| Field | Meaning |
|-------|---------|
| Host / IP | the hub's address (e.g. `127.0.0.1`) |
| Port | the hub's HiveMind port (default `5678`) |
| Access Key | the key from `hivemind-core add-client` |
| Password | the shared password for that client |

The password drives the HiveMind Protocol V1 handshake (PBKDF2-HMAC-SHA256 → an
AES-GCM session key), so all traffic after the handshake is encrypted end to end
between the browser and the hub.

## Optional headless bridge

The Python package also ships `hivemind_webchat.bridge.WebchatBridge`, a
server-side `hivemind-bus-client` client for headless relay / testing — it
connects to a hub, forwards utterances, and logs `speak` replies without a
browser. The bundled `all_in_one/launch.py` exposes it:

```
usage: launch.py [--webchat-port PORT] [--access-key KEY] [--host HOST]
                 [--port PORT] [--password PASSWORD] [--self-signed]

  --webchat-port  port to serve the webchat UI (default 9090)
  --access-key    HiveMind access key for the optional headless bridge
  --host          HiveMind hub host (default ws://127.0.0.1)
  --port          HiveMind hub port (default 5678)
  --password      HiveMind password
  --self-signed   accept self-signed ssl certificates
```

Without `--access-key`, `launch.py` only serves the UI (the browser connects to
the hub directly). With it, it also starts a headless bridge to the hub. The
bridge is the code path exercised by the Python end-to-end suite (see
[Testing](testing.md)).

---
[← Getting started](getting-started.md) · [Home](index.md) · [Architecture →](architecture.md)
