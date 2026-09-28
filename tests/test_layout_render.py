"""The page layout, measured in a real browser render.

At 400px and 360px the fixed navbar is 110px high (the Connect button wraps
under the logo). The chat container must start below it, and the Send button
must stay inside its message row and the viewport. These tests read the
rendered boxes, so a stronger CSS rule elsewhere cannot hide a regression.

They need Playwright and its Chromium. Without them the tests skip.
"""
import socket
import time
import urllib.request

import pytest

sync_api = pytest.importorskip("playwright.sync_api")

from hivemind_webchat import WebChat

HEIGHT = 700
BUBBLES = 30


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def base_url():
    port = _free_port()
    WebChat(port, daemon=True).start()
    url = f"http://127.0.0.1:{port}/"
    for _ in range(100):
        try:
            urllib.request.urlopen(url, timeout=1)
            break
        except OSError:
            time.sleep(0.1)
    else:
        pytest.fail("the webchat server did not start")
    return url


@pytest.fixture(scope="module")
def browser():
    with sync_api.sync_playwright() as p:
        try:
            b = p.chromium.launch(args=["--disable-dev-shm-usage", "--disable-gpu"])
        except Exception as e:  # no browser binary or system libraries
            pytest.skip(f"chromium does not launch: {e}")
        yield b
        b.close()


def _measure(browser, base_url, width):
    page = browser.new_page(viewport={"width": width, "height": HEIGHT})
    try:
        # the layout does not depend on the CDN scripts; keep the test offline
        page.route("**/*", lambda route: route.continue_()
                   if route.request.url.startswith(base_url) else route.abort())
        page.goto(base_url, wait_until="load")
        return page.evaluate("""(n) => {
            const chat = document.querySelector('.chat');
            for (let i = 0; i < n; i++) {
                const b = document.createElement('div');
                b.className = 'bubble you';
                b.textContent = 'a long reply that wraps over more than one line ' + i;
                chat.appendChild(b);
            }
            const box = (sel) => {
                const r = document.querySelector(sel).getBoundingClientRect();
                return {top: r.top, bottom: r.bottom, left: r.left, right: r.right};
            };
            return {
                navbar: box('.navbar-fixed-top'),
                container: box('.container'),
                send: box('#textbox_submit'),
                row: box('.container .right .write .form-group'),
                textbox: box('#textbox'),
                scrollWidth: document.documentElement.scrollWidth,
            };
        }""", BUBBLES)
    finally:
        page.close()


@pytest.mark.parametrize("width", [360, 400, 1280])
def test_navbar_does_not_cover_the_chat(browser, base_url, width):
    m = _measure(browser, base_url, width)
    assert m["container"]["top"] >= m["navbar"]["bottom"] - 1, m


@pytest.mark.parametrize("width", [360, 400, 1280])
def test_send_stays_in_its_row_and_the_viewport(browser, base_url, width):
    m = _measure(browser, base_url, width)
    send, row = m["send"], m["row"]
    assert 0 <= send["left"] and send["right"] <= width, m
    assert send["bottom"] <= HEIGHT, m
    assert row["left"] - 1 <= send["left"] and send["right"] <= row["right"] + 1, m
    assert m["textbox"]["right"] <= send["left"] + 1, m
    assert m["scrollWidth"] <= width, m
