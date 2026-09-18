// Hub and user text must show as text in the chat log, never as HTML.
import test from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./app_harness.mjs";

const PAYLOAD = '<img src=x onerror="alert(1)">';

function assertNoMarkup(page) {
    const html = page.chatHtml();
    assert.ok(!html.includes("<img"), `raw markup reached the chat log: ${html}`);
    assert.ok(html.includes("&lt;img src=x"), `payload text is missing from the chat log: ${html}`);
}

test("speak text from the hub shows as text", () => {
    const page = makePage();
    page.client.onMycroftSpeak({ data: { utterance: PAYLOAD } });
    assertNoMarkup(page);
});

test("error text from the hub shows as text", () => {
    const page = makePage();
    page.client.onHiveError(new Error(PAYLOAD));
    assertNoMarkup(page);
});

test("connect error text shows as text", () => {
    const page = makePage({ connect() { throw new Error(PAYLOAD); } });
    page.$("#credentialsForm").trigger("submit");
    assertNoMarkup(page);
});

test("user text sent with Enter shows as text", () => {
    const page = makePage();
    page.byId.textbox.value = PAYLOAD;
    page.$("#textbox").trigger("keypress", { which: 13, key: "Enter" });
    assertNoMarkup(page);
    assert.deepEqual(page.client.sent, [PAYLOAD]);
});

test("user text sent with the Send button shows as text", () => {
    const page = makePage();
    page.byId.textbox.value = PAYLOAD;
    page.$("#textbox_submit").trigger("click");
    assertNoMarkup(page);
    assert.deepEqual(page.client.sent, [PAYLOAD]);
});
