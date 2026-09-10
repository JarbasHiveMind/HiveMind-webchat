# Dependencies

All dependency policy lives in `pyproject.toml`. There is no `requirements.txt`,
`setup.py`, or `MANIFEST.in`. The browser-side `package.json` only declares the
`ws` dev-dependency used by the Node JS e2e test (the page itself loads
HiveMind-js from a CDN). Packaged web assets ship via
`[tool.setuptools.package-data]`.

## Runtime dependencies

| Package | Constraint | Role |
|---|---|---|
| `tornado` | any | The HTTP server that serves the chat page |
| `ovos-utils` | any | Logging / daemon helpers used by the bridge + launcher |
| `hivemind-bus-client` | `>=0.9.2a1,<1.0.0` | The optional headless `WebchatBridge` connection to the hub |

The HTTP server (`WebChat`) only needs `tornado`. `hivemind-bus-client` and
`ovos-utils` are pulled in for the optional headless bridge. The browser does
not use them, since it loads HiveMind-js in-page.

### Why the pre-release floor (the bus-client 2.x story)

The HiveMind **2.x** protocol stack (hub, agent plugin, harness) lives in the
pre-releases. `hivemind-bus-client>=0.9.2a1` is the 2.x line and rides
`ovos-bus-client>=2.0.0a3`. Flooring the bus-client at its alpha is enough for
`uv`/`pip` to select the 2.x-compatible versions. A pre-release **min-version
pin is sufficient**, so `--pre` / `pre_install_pip` is never used.

## Test / e2e dependencies (`[e2e]` extra)

The `e2e` extra adds the in-process hub + harness used by `tests/e2e/`:

| Package | Constraint | Role |
|---|---|---|
| `pytest`, `pytest-timeout` | any | Test runner |
| `hivescope` | `>=0.5.2a1` | In-process hub + loopback WebSocket + assertions |
| `hivemind-core` | `>=4.6.2a1` | Real hub master booted in-process |
| `ovos-bus-client` | `>=2.0.0a3,<3.0.0` | OVOS `Message` / bus on the 2.x line |
| `ovos-plugin-manager` | `>=2.4.1a1,<3.0.0` | Transitive floor so the OVOS alphas allow bus-client 2.x |
| `hivemind-ovos-agent-plugin` | `>=0.3.1a1` | Hub agent protocol / policy chain |
| `hivemind-plugin-manager` | `>=0.8.0a1` | Hub protocol plugin manager |

`hivemind-core`'s own transitive pre-release floors (`json-database`,
`hivemind-sqlite-database`, `hivemind-json-db-plugin`, `hivemind-websocket-protocol`,
`ovos-utils`, `ovos-workshop`) are restated in the `e2e` extra so the resolver
picks those alphas without `--pre`. Without these floors the stable
`hivemind-core` 4.0.0 line (old bus-client pin) wins and conflicts with the
prerelease bus-client (`ResolutionImpossible`).

A `test` alias (`hivemind_webchat[e2e]`) is kept for shared-CI compatibility.

## Resolving locally

```bash
uv pip install -e ".[e2e]"
```

---
[← Deployment](deployment.md) · [Home](index.md) · [Testing →](testing.md)
