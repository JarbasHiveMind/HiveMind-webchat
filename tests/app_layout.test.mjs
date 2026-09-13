// The page layout at a 400px viewport: the Send button stays in the message
// row, and the fixed navbar does not cover the chat log. These tests read the
// CSS rules; they do not render the page.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { APP_JS } from "./app_harness.mjs";

const css = readFileSync(path.join(path.dirname(APP_JS), "..", "css", "app.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

function lastRule(selector) {
    const re = new RegExp("(?:^|\\n)" + selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}", "g");
    let m, body = null;
    while ((m = re.exec(css))) body = m[1];
    return body || "";
}

test("the chat container starts below the fixed navbar", () => {
    const rule = lastRule(".container");
    const top = /(?:^|;|\n)\s*top:\s*(\d+)px/.exec(rule);
    assert.ok(top, "the .container rule has no top offset, so the navbar covers the chat");
    assert.ok(Number(top[1]) >= 80, `top offset ${top[1]}px is less than the 80px navbar brand`);
    assert.match(rule, new RegExp(`height:\\s*calc\\(100% - ${top[1]}px\\)`));
});

test("the message row is a flex row, so Send keeps its width", () => {
    assert.match(lastRule(".container .right .write .form-group"), /display:\s*flex/);
    assert.match(lastRule(".container .right .write .col-xs-11"), /flex:\s*1 1 auto/);
    assert.match(lastRule(".container .right .write .col-xs-11"), /min-width:\s*0/);
    const send = lastRule(".container .right .write .col-xs-1");
    assert.match(send, /flex:\s*0 0 auto/);
    assert.match(send, /width:\s*auto/, "the Send column is 8.33% wide, too narrow for the button at 400px");
    assert.match(lastRule(".container .right .write input"), /width:\s*100%/);
});
