// Accessibility of the chat page: live region, focus, names, contrast.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { makePage, INDEX_HTML, APP_JS } from "./app_harness.mjs";

const html = readFileSync(INDEX_HTML, "utf8");
const css = readFileSync(path.join(path.dirname(APP_JS), "..", "css", "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

test("the chat log is a polite live region", () => {
    const tag = /<div class="chat"[^>]*>/.exec(html)[0];
    assert.match(tag, /role="log"/);
    assert.match(tag, /aria-live="polite"/);
});

test("focus stays in the message box after Enter and after Send", () => {
    const page = makePage();
    page.$("#textbox").focus();
    page.byId.textbox.value = "hello";
    page.$("#textbox").trigger("keypress", { which: 13, key: "Enter" });
    assert.equal(page.state.focused, page.byId.textbox, "Enter removed focus from the message box");
    page.$("#textbox_submit").focus();
    page.byId.textbox.value = "hello";
    page.$("#textbox_submit").trigger("click");
    assert.equal(page.state.focused, page.byId.textbox, "Send did not return focus to the message box");
});

test("the message box keeps a visible focus outline", () => {
    const rule = /\.container \.right \.write input \{([^}]*)\}/.exec(css)[1];
    assert.ok(!/outline:\s*none/.test(rule), "outline: none hides keyboard focus");
    assert.match(css, /\.write input:focus\s*\{[^}]*outline:\s*2px solid/);
});

test("controls have accessible names", () => {
    assert.match(html, /<label for="textbox"[^>]*>Message<\/label>/);
    const input = /<input[^>]*id="textbox"[^>]*>/.exec(html)[0];
    assert.equal((input.match(/"/g) || []).length % 2, 0, `the message input has a stray quote: ${input}`);
    assert.ok(!/"\s*"?\/?>$/.test(input.replace(/="[^"]*"/g, "")), `the message input has a stray quote: ${input}`);
    assert.match(html, /class="close"[^>]*aria-label="Close"/);
    assert.match(html, /ovos-logo-512\.png" alt="OpenVoiceOS"/);
    const send = /<button[^>]*id="textbox_submit"[^>]*>([\s\S]*?)<\/button>/.exec(html)[1];
    assert.ok(!send.includes("fa-volume-up"), "the Send button shows a speaker icon");
    for (const icon of send.match(/<i [^>]*>/g) || []) assert.match(icon, /aria-hidden="true"/);
});

function luminance(hex) {
    const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

test("reply bubble text meets WCAG AA contrast (4.5:1)", () => {
    const rule = /\.container \.right \.bubble\.you \{([^}]*)\}/.exec(css)[1];
    const bg = /background-color:\s*#([0-9a-fA-F]{6})/.exec(rule)[1];
    assert.match(rule, /color:\s*white/);
    const ratio = 1.05 / (luminance(bg) + 0.05);
    assert.ok(ratio >= 4.5, `contrast ${ratio.toFixed(2)}:1 on #${bg}`);
});
