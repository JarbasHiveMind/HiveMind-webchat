// Test harness that runs hivemind_webchat/static/js/app.js in Node.
//
// It supplies a small fake DOM and a jQuery subset, plus a fake HiveMind
// client. It has no dependencies, so the page script is tested without a
// browser. Markup that app.js gives to jQuery as an HTML string with content
// is kept raw, as a browser would parse it. Text set with .text() is escaped.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_JS = path.join(here, "..", "hivemind_webchat", "static", "js", "app.js");
export const INDEX_HTML = path.join(here, "..", "hivemind_webchat", "templates", "index.html");

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

class FakeElement {
    constructor(tag, attrs = {}) {
        this.tag = tag;
        this.attrs = { ...attrs };
        this.classes = new Set((attrs.class || "").split(/\s+/).filter(Boolean));
        delete this.attrs.class;
        this.children = [];
        this.handlers = {};
        this.value = "";
        this.style = {};
    }
    get id() { return this.attrs.id; }
    textContent() {
        return this.children.map((c) => (typeof c === "string" ? c
            : c.raw !== undefined ? c.raw.replace(/<[^>]*>/g, "") : c.textContent())).join("");
    }
    outerHTML() {
        const cls = this.classes.size ? ` class="${[...this.classes].join(" ")}"` : "";
        const attrs = Object.entries(this.attrs).map(([k, v]) => ` ${k}="${v}"`).join("");
        const inner = this.children.map((c) => (typeof c === "string" ? escapeHtml(c)
            : c.raw !== undefined ? c.raw : c.outerHTML())).join("");
        return `<${this.tag}${cls}${attrs}>${inner}</${this.tag}>`;
    }
    descendants() {
        const out = [];
        for (const c of this.children) {
            if (c instanceof FakeElement) out.push(c, ...c.descendants());
        }
        return out;
    }
}

// Parse one opening tag with no content, for example '<div class="a b">'.
function parseSingleTag(html) {
    const m = /^\s*<([a-zA-Z0-9]+)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*\/?>\s*(?:<\/\1>)?\s*$/.exec(html);
    if (!m) return null;
    const attrs = {};
    for (const a of m[2].matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] ?? "";
    return new FakeElement(m[1], attrs);
}

export function makePage({ sendUtterance, connect } = {}) {
    const root = new FakeElement("body");
    const ids = ["connectBtn", "credentialsModal", "credentialsForm", "accessKey", "password",
        "ip", "port", "psk", "serverKey", "textbox", "textbox_submit", "connectionStatus"];
    const byId = {};
    for (const id of ids) {
        const tag = /Btn|submit/.test(id) ? "button" : /Form/.test(id) ? "form" : /Modal|Status/.test(id) ? "div" : "input";
        byId[id] = new FakeElement(tag, { id });
        root.children.push(byId[id]);
    }
    const chat = new FakeElement("div", { class: "chat", "data-chat": "person2" });
    root.children.push(chat);

    const state = { focused: null, modal: [], alerts: [] };

    function all() { return [root, ...root.descendants()]; }

    function query(selector) {
        const last = selector.trim().split(/\s+/).pop().replace(/\[.*\]$/, "");
        if (last.startsWith("#")) return byId[last.slice(1)] ? [byId[last.slice(1)]] : [];
        if (last.startsWith(".")) {
            const cls = last.slice(1).split(".");
            return all().filter((e) => cls.every((c) => e.classes.has(c)));
        }
        return all().filter((e) => e.tag === last);
    }

    function wrap(els) {
        const w = {
            els,
            length: els.length,
            addClass(c) { for (const e of els) c.split(/\s+/).forEach((x) => x && e.classes.add(x)); return w; },
            removeClass(c) { for (const e of els) c.split(/\s+/).forEach((x) => e.classes.delete(x)); return w; },
            hasClass(c) { return els.some((e) => e.classes.has(c)); },
            text(t) {
                if (t === undefined) return els.map((e) => e.textContent()).join("");
                for (const e of els) e.children = [String(t)];
                return w;
            },
            html(h) {
                if (h === undefined) return els.map((e) => e.children.map((c) => (typeof c === "string" ? escapeHtml(c) : c.raw ?? c.outerHTML())).join("")).join("");
                for (const e of els) e.children = [{ raw: String(h) }];
                return w;
            },
            append(...items) {
                for (const e of els) {
                    for (const item of items) {
                        if (item && item.els) e.children.push(...item.els);
                        else if (item instanceof FakeElement) e.children.push(item);
                        else if (typeof item === "string") {
                            const single = parseSingleTag(item);
                            e.children.push(single || { raw: item });
                        }
                    }
                }
                return w;
            },
            attr(k, v) {
                if (v === undefined) return els[0] ? (k === "class" ? [...els[0].classes].join(" ") : els[0].attrs[k]) : undefined;
                for (const e of els) e.attrs[k] = String(v);
                return w;
            },
            removeAttr(k) { for (const e of els) delete e.attrs[k]; return w; },
            prop(k, v) {
                if (v === undefined) return els[0] ? els[0].attrs[k] !== undefined : undefined;
                for (const e of els) { if (v) e.attrs[k] = ""; else delete e.attrs[k]; }
                return w;
            },
            val(v) {
                if (v === undefined) return els[0] ? els[0].value : undefined;
                for (const e of els) e.value = String(v);
                return w;
            },
            find(sel) {
                const cls = sel.replace(/^\./, "");
                return wrap(els.flatMap((e) => e.descendants().filter((d) => d.classes.has(cls))));
            },
            modal(cmd) { state.modal.push([els[0] && els[0].id, cmd]); return w; },
            focus() { state.focused = els[0] || null; return w; },
            blur() { if (els.includes(state.focused)) state.focused = null; return w; },
            scrollTop() { return w; },
            each(fn) { els.forEach((e, i) => fn.call(e, i, e)); return w; },
            get 0() { return els[0]; },
        };
        for (const ev of ["click", "submit", "keypress", "keydown", "mousedown"]) {
            w[ev] = (fn) => {
                if (fn === undefined) { w.trigger(ev); return w; }
                for (const e of els) (e.handlers[ev] ||= []).push(fn);
                return w;
            };
        }
        w.on = (ev, fn) => { for (const e of els) (e.handlers[ev] ||= []).push(fn); return w; };
        w.trigger = (ev, extra = {}) => {
            let result;
            for (const e of els) {
                for (const fn of e.handlers[ev] || []) {
                    const event = { which: extra.which, key: extra.key, preventDefault() { this.defaultPrevented = true; } };
                    result = fn.call(e, event);
                }
            }
            return result;
        };
        return w;
    }

    const readyFns = [];
    function $(arg) {
        if (typeof arg === "function") { readyFns.push(arg); return; }
        if (arg === documentStub) return { ready(fn) { readyFns.push(fn); } };
        if (arg instanceof FakeElement) return wrap([arg]);
        if (typeof arg === "string" && arg.trim().startsWith("<")) {
            const single = parseSingleTag(arg);
            return wrap([single || Object.assign(new FakeElement("div"), { children: [{ raw: arg }] })]);
        }
        return wrap(query(arg));
    }

    const documentStub = {
        getElementById(id) { return byId[id] || null; },
        get activeElement() { return state.focused; },
    };

    const clients = [];
    class FakeHiveMind {
        constructor() {
            this.sent = [];
            this.connectCalls = [];
            clients.push(this);
        }
        connect(...args) {
            this.connectCalls.push(args);
            if (connect) return connect.call(this, ...args);
        }
        sendUtterance(text) {
            this.sent.push(text);
            if (sendUtterance) return sendUtterance.call(this, text);
            return Promise.resolve();
        }
    }

    const logs = [];
    const context = {
        $, jQuery: $, document: documentStub, JarbasHiveMind: FakeHiveMind,
        console: { log: (...a) => logs.push(a), error: (...a) => logs.push(a), warn: (...a) => logs.push(a) },
        alert: (m) => state.alerts.push(m),
        setTimeout, clearTimeout, Promise,
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(readFileSync(APP_JS, "utf8"), context, { filename: APP_JS });
    for (const fn of readyFns) fn.call(documentStub, $);

    return {
        $, byId, chat, state, logs,
        get client() { return clients[0]; },
        chatHtml: () => chat.outerHTML(),
        bubbles: () => chat.children.map((c) => (c instanceof FakeElement ? c
            : Object.assign(new FakeElement("raw"), { children: [c] }))),
        flush: () => new Promise((r) => setTimeout(r, 0)),
    };
}
