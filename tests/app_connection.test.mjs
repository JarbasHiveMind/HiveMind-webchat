// The page shows the connection state, and says when a message was not sent.
import test from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./app_harness.mjs";

const bubbleTexts = (page) => page.bubbles().map((b) => b.textContent().trim());

test("a failed send tells the user the message was not sent", async () => {
    const page = makePage({ sendUtterance: () => Promise.reject(new Error("Not connected: handshake not complete")) });
    let unhandled = null;
    const onUnhandled = (e) => { unhandled = e; };
    process.on("unhandledRejection", onUnhandled);
    try {
        page.byId.textbox.value = "hello";
        page.$("#textbox").trigger("keypress", { which: 13, key: "Enter" });
        page.byId.textbox.value = "again";
        page.$("#textbox_submit").trigger("click");
        await page.flush();
        await page.flush();
    } finally {
        process.off("unhandledRejection", onUnhandled);
    }
    assert.equal(unhandled, null, "the send rejection was not handled");
    const notSent = bubbleTexts(page).filter((t) => t.includes("Message not sent"));
    assert.equal(notSent.length, 2, bubbleTexts(page).join(" | "));
});

test("submit shows a connecting state", (t) => {
    // mock timers, so the connect timeout does not keep the process alive
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const page = makePage();
    assert.equal(page.byId.connectBtn.textContent(), "Connect to HiveMind");
    page.$("#credentialsForm").trigger("submit");
    assert.equal(page.byId.connectBtn.textContent(), "Connecting...");
    assert.ok(page.byId.connectBtn.classes.has("btn-warning"));
    assert.ok("disabled" in page.byId.connectBtn.attrs);
});

test("rejected credentials show one reason and no 'connection lost'", () => {
    const page = makePage();
    page.$("#credentialsForm").trigger("submit");
    page.client.onHiveError(new Error("credentials rejected by server (close code 1008)"));
    page.client.onHiveDisconnected();
    const texts = bubbleTexts(page);
    assert.equal(texts.length, 1, texts.join(" | "));
    assert.match(texts[0], /Could not connect to HiveMind: credentials rejected/);
    assert.equal(page.byId.connectBtn.textContent(), "Connect to HiveMind");
    assert.ok(!("disabled" in page.byId.connectBtn.attrs));
});

test("a hub that does not answer enables Connect again after the timeout", (t) => {
    // enable before makePage: the harness copies setTimeout into the page
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const page = makePage();
    page.$("#credentialsForm").trigger("submit");
    t.mock.timers.tick(14999);
    assert.equal(page.byId.connectBtn.textContent(), "Connecting...");
    t.mock.timers.tick(1);
    assert.equal(page.byId.connectBtn.textContent(), "Connect to HiveMind");
    assert.ok(!("disabled" in page.byId.connectBtn.attrs));
    const texts = bubbleTexts(page);
    assert.equal(texts.length, 1, texts.join(" | "));
    assert.match(texts[0], /Could not connect to HiveMind: the hub did not answer/);
});

test("a connect before the timeout cancels it", (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const page = makePage();
    page.$("#credentialsForm").trigger("submit");
    page.client.onHiveConnected();
    t.mock.timers.tick(20000);
    assert.equal(page.byId.connectBtn.textContent(), "Connected");
    assert.ok(!bubbleTexts(page).some((x) => x.includes("did not answer")));
});

test("a drop after connect says 'connection lost' and keeps one label", () => {
    const page = makePage();
    page.$("#credentialsForm").trigger("submit");
    page.client.onHiveConnected();
    assert.equal(page.byId.connectBtn.textContent(), "Connected");
    page.client.onHiveDisconnected();
    assert.ok(bubbleTexts(page).some((t) => t.includes("connection lost")));
    assert.equal(page.byId.connectBtn.textContent(), "Connect to HiveMind");
});
