# Troubleshooting

## The browser cannot reach the page

- Confirm the server is running: `hivemind-webchat --port 9090` prints
  `Starting WebChat: <ip>:9090`.
- `--port` is the **HTTP** port, not the hub port. Open `http://localhost:9090`.

## "Web Crypto is unavailable" / handshake never starts in the browser

Browsers only expose `window.crypto.subtle` on **secure contexts**:
`http://localhost`, `http://127.0.0.1`, or any `https://` origin. If you serve
the page on a LAN IP over plain HTTP, the V1 handshake cannot run — put the
server behind TLS (see [Deployment](deployment.md)).

## Connect form spins / "disconnected during handshake"

- Check **Host** and **Port** point at the hub's **HiveMind** port (default
  `5678`), not the webchat HTTP port.
- Check the **Access Key** and **Password** match a client registered on the hub
  (`hivemind-core add-client`). A wrong password fails the PBKDF2 handshake.
- Confirm the hub is listening: `hivemind-core listen --port 5678`.

## Nothing comes back after I send a message

The hub must have a skills/agent (`ovos-core`) attached and the client's
`allowed_types` must permit `recognizer_loop:utterance`. WebChat only sends the
utterance and renders `speak` replies; the answer is produced by the agent
behind the hub.

## Python e2e fails to resolve dependencies

Install the `[e2e]` extra — it carries the pre-release floors for the whole
HiveMind 2.x stack:

```bash
uv pip install -e ".[e2e]"
```

Do **not** pass `--pre`; the min-version pins are enough (see
[Dependencies](dependencies.md)). A bare install that pulls the stable
`hivemind-core` 4.0.0 line will hit a `ResolutionImpossible` against the
prerelease bus-client.

## JS e2e: "hub fixture timeout" or import errors

`npm test` spawns `tests/hub_fixture.py`, which needs a Python interpreter with
the `[e2e]` stack (`hivescope`, `hivemind-core`). Point it at the right
interpreter:

```bash
PYTHON=/path/to/venv/bin/python npm test
```

If the HiveMind-js client cannot be found, the test fetches it from the CDN; set
`HIVEMIND_JS_PATH` to use a local checkout or `HIVEMIND_JS_URL` to override the
CDN URL.
