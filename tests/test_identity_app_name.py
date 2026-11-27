"""The bridge connects with its own identity (HIVEMIND-CRYPTO-1 §2)."""
from unittest.mock import MagicMock, patch

from hivemind_webchat import bridge
from hivemind_webchat.bridge import WebchatBridge


def test_the_bridge_builds_its_client_with_its_own_identity():
    identity = MagicMock()
    with patch.object(bridge, "NodeIdentity", return_value=identity) as ctor, \
         patch.object(bridge, "HiveMessageBusClient") as client:
        WebchatBridge("k", password="p")
    ctor.assert_called_once_with(app_name="webchat")
    assert client.call_args.kwargs["identity"] is identity


def test_a_given_identity_is_used_as_is():
    identity = MagicMock()
    with patch.object(bridge, "NodeIdentity") as ctor, \
         patch.object(bridge, "HiveMessageBusClient") as client:
        WebchatBridge("k", password="p", identity=identity)
    ctor.assert_not_called()
    assert client.call_args.kwargs["identity"] is identity
