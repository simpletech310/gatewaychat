(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const botId = script.getAttribute("data-bot-id");
  if (!botId) {
    console.error("[GatewayChat] data-bot-id is required on the script tag");
    return;
  }
  const apiBase =
    script.getAttribute("data-api-base") || new URL(script.src).origin;

  // Persist a visitor id + conversation id in localStorage.
  const STORAGE_KEY = "gc:" + botId;
  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }
  const state = loadState();
  if (!state.visitorId) {
    state.visitorId =
      "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    saveState(state);
  }

  function inject(css) {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "style") Object.assign(e.style, attrs[k]);
        else if (k.startsWith("on") && typeof attrs[k] === "function")
          e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
      }
    }
    for (const c of children) {
      if (c == null) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  }

  function init(config) {
    const color = config.primaryColor || "#2563eb";

    inject(
      `
      .gc-launcher{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:28px;background:${color};color:#fff;border:0;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .15s ease}
      .gc-launcher:hover{transform:scale(1.05)}
      .gc-launcher svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2}
      .gc-window{position:fixed;bottom:88px;right:20px;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#111;z-index:2147483647}
      .gc-window.open{display:flex}
      .gc-header{background:${color};color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
      .gc-header img{width:28px;height:28px;border-radius:50%;object-fit:cover;background:#fff}
      .gc-header .gc-title{font-weight:600;flex:1}
      .gc-header .gc-close{background:transparent;border:0;color:#fff;cursor:pointer;font-size:20px;line-height:1;padding:4px}
      .gc-body{flex:1;overflow-y:auto;padding:14px;background:#f8fafc;display:flex;flex-direction:column;gap:8px}
      .gc-msg{max-width:80%;padding:9px 12px;border-radius:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}
      .gc-msg.user{background:${color};color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
      .gc-msg.bot{background:#fff;color:#111;align-self:flex-start;border:1px solid #e5e7eb;border-bottom-left-radius:4px}
      .gc-msg.bot a{color:${color};text-decoration:underline}
      .gc-typing{display:flex;gap:4px;padding:9px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;align-self:flex-start;width:fit-content}
      .gc-typing span{width:7px;height:7px;border-radius:50%;background:#cbd5e1;animation:gc-bounce 1.2s infinite}
      .gc-typing span:nth-child(2){animation-delay:.15s}
      .gc-typing span:nth-child(3){animation-delay:.3s}
      @keyframes gc-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
      .gc-input{border-top:1px solid #e5e7eb;padding:10px;display:flex;gap:8px;background:#fff}
      .gc-input textarea{flex:1;resize:none;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;font:inherit;color:#111;background:#fff;outline:none;max-height:96px;min-height:36px}
      .gc-input textarea:focus{border-color:${color}}
      .gc-input button{background:${color};color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer;font-weight:500}
      .gc-input button:disabled{opacity:.5;cursor:not-allowed}
      .gc-footer{font-size:11px;color:#94a3b8;text-align:center;padding:6px}
    `,
    );

    const launcher = el(
      "button",
      { class: "gc-launcher", "aria-label": "Open chat" },
      (() => {
        const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        s.setAttribute("viewBox", "0 0 24 24");
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute(
          "d",
          "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
        );
        p.setAttribute("stroke-linecap", "round");
        p.setAttribute("stroke-linejoin", "round");
        s.appendChild(p);
        return s;
      })(),
    );

    const body = el("div", { class: "gc-body" });
    const input = el("textarea", { rows: "1", placeholder: "Type a message…" });
    const sendBtn = el("button", { type: "button" }, "Send");
    const inputRow = el("div", { class: "gc-input" }, input, sendBtn);
    const win = el(
      "div",
      { class: "gc-window", role: "dialog", "aria-label": config.title },
      el(
        "div",
        { class: "gc-header" },
        config.logoUrl ? el("img", { src: config.logoUrl, alt: "" }) : null,
        el("div", { class: "gc-title" }, config.title || "Chat"),
        el(
          "button",
          {
            class: "gc-close",
            "aria-label": "Close",
            onclick: () => win.classList.remove("open"),
          },
          "×",
        ),
      ),
      body,
      inputRow,
      el("div", { class: "gc-footer" }, "Powered by GatewayChat"),
    );

    document.body.appendChild(launcher);
    document.body.appendChild(win);

    let busy = false;
    let typingEl = null;

    function addMessage(role, text) {
      const m = el("div", { class: "gc-msg " + role }, text);
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
      return m;
    }
    function showTyping() {
      typingEl = el(
        "div",
        { class: "gc-typing" },
        el("span"),
        el("span"),
        el("span"),
      );
      body.appendChild(typingEl);
      body.scrollTop = body.scrollHeight;
    }
    function hideTyping() {
      if (typingEl) {
        typingEl.remove();
        typingEl = null;
      }
    }

    async function send() {
      if (busy) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      input.style.height = "";
      addMessage("user", text);
      busy = true;
      sendBtn.disabled = true;
      showTyping();
      try {
        const res = await fetch(apiBase + "/api/chat/" + botId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversationId: state.conversationId,
            visitorId: state.visitorId,
            pageUrl: location.href,
          }),
        });
        const data = await res.json();
        hideTyping();
        if (!res.ok) {
          addMessage("bot", "Sorry, something went wrong. Please try again.");
          console.error("[GatewayChat]", data);
        } else {
          if (data.conversationId) {
            state.conversationId = data.conversationId;
            saveState(state);
          }
          addMessage("bot", data.reply || "");
        }
      } catch (err) {
        hideTyping();
        addMessage("bot", "Connection error. Please try again.");
        console.error("[GatewayChat]", err);
      } finally {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 96) + "px";
    });

    launcher.addEventListener("click", () => {
      win.classList.toggle("open");
      if (win.classList.contains("open")) {
        if (!body.childElementCount && config.welcomeMessage) {
          addMessage("bot", config.welcomeMessage);
        }
        input.focus();
      }
    });
  }

  fetch(apiBase + "/api/public/bots/" + botId)
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load chatbot config");
      return r.json();
    })
    .then(init)
    .catch((err) => console.error("[GatewayChat]", err));
})();
