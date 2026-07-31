#!/usr/bin/env python3
"""Loopback HiveMind hub fixture for the JS-client end-to-end test.

Spins up a *real* hivemind-core master (a loopback WebSocket server) using
``hivescope``'s :class:`TopologyBuilder`, registers a single satellite, and
drives a tiny stdin/stdout line protocol so the Node test (``e2e.mjs``) can
orchestrate it:

* on start it prints one JSON line ``{"url": ..., "name": ..., "key": ...,
  "password": ...}`` to stdout, then blocks reading stdin;
* when it reads ``check`` on stdin it prints a JSON line
  ``{"utterances": N}`` reporting how many ``recognizer_loop:utterance``
  messages the hub injected onto its bus, then exits ``0`` if N > 0 else ``1``.

It exits cleanly on EOF / ``stop`` as well. This is the Python half of the
e2e: it proves the encrypted V1 frames the browser client sends are decrypted
and routed by an authentic hub.
"""
import json
import sys

from hivescope.topology import TopologyBuilder

# hivemind-core / ovos logging writes to stdout; prefix our machine-readable
# lines with a sentinel so the Node driver can pick them out of the noise.
SENTINEL = "@@HUB@@ "


def emit(obj):
    print(SENTINEL + json.dumps(obj), flush=True)

SAT_NAME = "webchat-js-sat"
SAT_KEY = "webchat-js-sat"  # name and access key are the same in this fixture
SAT_PASSWORD = "webchat-js-password"


def main() -> int:
    builder = TopologyBuilder()
    master = builder.add_master("M0", use_loopback=True)
    master.register_satellite(
        SAT_NAME,
        password=SAT_PASSWORD,
        allowed_types=["recognizer_loop:utterance"],
    )
    builder.start_all()
    try:
        info = {
            "url": master.network_protocol.url,
            "name": SAT_NAME,
            "key": SAT_KEY,
            "password": SAT_PASSWORD,
        }
        emit(info)

        # Block until the Node driver asks us to verify (or stdin closes).
        for line in sys.stdin:
            if line.strip() == "check":
                break
            if line.strip() == "stop":
                return 0

        injected = master.agent_protocol.injected
        utterances = [
            msg for msg in injected
            if getattr(msg, "msg_type", None) == "recognizer_loop:utterance"
        ]
        emit({"utterances": len(utterances)})
        return 0 if utterances else 1
    finally:
        builder.stop_all()


if __name__ == "__main__":
    sys.exit(main())
