# Getting started

## Prerequisites

- Python 3.10+
- A running [hivemind-core](https://github.com/JarbasHiveMind/HiveMind-core) hub
  on the network, with an access key/password issued for this client.
- A browser (any modern browser with Web Crypto, i.e. served over `http://localhost`
  or `https://`).

The hub and the skills/agent (`ovos-core`) run as **separate services** — this
package is only the webchat front end.

## Install

```bash
pip install hivemind-webchat
```

From source:

```bash
git clone https://github.com/JarbasHiveMind/HiveMind-webchat
cd HiveMind-webchat
pip install .
```

## 1. Run a hub and issue an access key

On the machine that hosts the assistant, install and run hivemind-core, then add
a client for the webchat:

```bash
hivemind-core add-client
# note the printed access key and password
hivemind-core listen --port 5678
```

## 2. Start the WebChat server

```bash
hivemind-webchat --port 9090
```

This serves the chat page at `http://localhost:9090`. The port here is the web
server's HTTP port, **not** the hub port.

## 3. Connect from the browser

Open `http://localhost:9090`, fill in the connection form, and click
**Connect to HiveMind**:

| Field | Value |
|-------|-------|
| Host / IP | the hub's address (e.g. `127.0.0.1`) |
| Port | the hub's HiveMind port (default `5678`) |
| Access Key | the key from `hivemind-core add-client` |
| Password | the shared password for that client |

Once the handshake completes, type a message — it is sent to the hub as a
`recognizer_loop:utterance` and spoken replies appear in the chat log.

See [Configuration](configuration.md) for the optional headless bridge and
[Architecture](architecture.md) for how the pieces fit together.
