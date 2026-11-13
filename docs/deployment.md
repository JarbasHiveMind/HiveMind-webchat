# Deployment

## Serving the page

`hivemind-webchat --port 9090` runs a plain-HTTP Tornado server. The HiveMind
connection (browser ↔ hub) is **always encrypted end to end** via the V1
handshake, independent of how the page itself is served.

For anything beyond local use, put the HTTP server behind a reverse proxy with
TLS (so the page loads over `https://`, which browsers require for Web Crypto on
non-localhost origins):

```nginx
server {
    listen 443 ssl;
    server_name webchat.example.com;
    # ssl_certificate / ssl_certificate_key via Let's Encrypt
    location / {
        proxy_pass http://127.0.0.1:9090;
    }
}
```

[Caddy](https://caddyserver.com/) or [Let's Encrypt](https://letsencrypt.org/)
with nginx both work.

## Docker (`all_in_one/`)

`all_in_one/Dockerfile` builds an image that serves the UI and, optionally,
starts the headless bridge:

```bash
docker build -t hivemind-webchat -f all_in_one/Dockerfile .
docker run -p 9090:9090 hivemind-webchat            # UI only
docker run -p 9090:9090 hivemind-webchat \
    --access-key KEY --host ws://HUB --port 5678 --password PASS   # + bridge
```

Runtime deps come from `pyproject.toml`, so the image just installs the package.
The hub (`hivemind-core`) and skills/agent (`ovos-core`) are **not** bundled —
run them as separate services.

## Static demo (gh-pages)

A static build is published from the `gh-pages` branch at
<https://jarbashivemind.github.io/HiveMind-webchat>. It is the same page this
server serves, pointed at whatever hub you enter in the form. No infrastructure
of your own is required to try it.

---
[← Architecture](architecture.md) · [Home](index.md) · [Dependencies →](dependencies.md)
