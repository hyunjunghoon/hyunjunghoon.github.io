/*
 * Dayframe "Ask someone" fallback pages. No server, no external scripts.
 * All data lives in the URL fragment (#payload), which browsers never send to the server.
 *
 * payload = base64url (no padding) of UTF-8 JSON
 *   ask:   {"v":1,"id":"<12 chars>","q":"<question>","from":"<owner name, optional>","l":"ko|en"}
 *   reply: {"v":1,"id":"<same id>","q":"<question>","by":"<responder>","a":"<answer>"}
 * Same format as util/AskLinks.kt in the Android app.
 *
 * Every piece of user data is written with textContent / value only, never innerHTML.
 */
(function () {
  "use strict";

  var BASE = "https://hyunjunghoon.github.io/dayframe";
  var PLAY_URL = "https://play.google.com/store/apps/details?id=com.tallowbird.dayframe";
  var PACKAGE = "com.tallowbird.dayframe";
  var MAX_Q = 300, MAX_A = 1000, MAX_NAME = 40;

  var STRINGS = {
    en: {
      askedYou: "{0} asked you",
      someone: "Someone",
      yourName: "Your name",
      namePlaceholder: "e.g. Mom",
      yourAnswer: "Your answer",
      answerPlaceholder: "Write your answer…",
      send: "Send answer",
      replyMessage: "Here's my answer: {0}",
      copied: "Link copied. Paste it into your chat to send your answer back.",
      copyManual: "Copy this link and send it back:",
      shared: "Sent! Thanks for answering.",
      promo: "Use Dayframe to keep your own daily answers",
      getApp: "Get the app",
      answered: "{0} answered",
      question: "Question",
      openApp: "Open in Dayframe",
      openHint: "Open this on the phone that sent the question to add the answer to the day it was asked.",
      errorTitle: "This link doesn't work",
      errorBody: "It may have been cut off when it was copied. Ask the sender to share it again.",
      askTitle: "A question for you · Dayframe",
      replyTitle: "An answer · Dayframe"
    },
    ko: {
      askedYou: "{0}님의 질문",
      someone: "누군가",
      yourName: "내 이름",
      namePlaceholder: "예: 엄마",
      yourAnswer: "내 답",
      answerPlaceholder: "답을 적어 주세요…",
      send: "답 보내기",
      replyMessage: "제 답장이에요: {0}",
      copied: "링크를 복사했어요. 대화방에 붙여 넣어 답을 보내 주세요.",
      copyManual: "이 링크를 복사해서 보내 주세요:",
      shared: "보냈어요! 답해 주셔서 고마워요.",
      promo: "Dayframe으로 나만의 하루 답을 모아 보세요",
      getApp: "앱 받기",
      answered: "{0}님의 답",
      question: "질문",
      openApp: "Dayframe에서 열기",
      openHint: "질문을 보낸 휴대폰에서 열면 그날의 기록에 답이 추가돼요.",
      errorTitle: "링크를 열 수 없어요",
      errorBody: "복사하다가 잘렸을 수 있어요. 보낸 분께 다시 보내 달라고 해 주세요.",
      askTitle: "질문이 도착했어요 · Dayframe",
      replyTitle: "답장이 도착했어요 · Dayframe"
    }
  };

  // ---------- helpers ----------

  function fmt(s, a) { return s.replace("{0}", a); }

  function $(id) { return document.getElementById(id); }

  function setText(id, text) { var el = $(id); if (el) el.textContent = text; }

  /** Cut to max UTF-16 units without splitting a surrogate pair (same rule as the app). */
  function truncate(s, max) {
    s = String(s == null ? "" : s);
    if (s.length <= max) return s;
    var end = max;
    var c = s.charCodeAt(end - 1);
    if (c >= 0xD800 && c <= 0xDBFF) end--;
    return s.slice(0, end);
  }

  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+/]/g, "");
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  function readPayload() {
    var raw = (location.hash || "").replace(/^#/, "");
    try { raw = decodeURIComponent(raw); } catch (e) { /* keep raw */ }
    raw = raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/[^A-Za-z0-9_-]/g, "");
    if (!raw) return null;
    try {
      var obj = JSON.parse(b64urlDecode(raw));
      return obj && typeof obj === "object" ? { obj: obj, raw: raw } : null;
    } catch (e) {
      return null;
    }
  }

  function str(v) { return typeof v === "string" ? v.trim() : ""; }

  function validId(id) { return /^[A-Za-z0-9_-]{6,32}$/.test(id); }

  function pickLang(fromPayload) {
    if (fromPayload === "ko" || fromPayload === "en") return fromPayload;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    return nav.toLowerCase().indexOf("ko") === 0 ? "ko" : "en";
  }

  function isAndroid() { return /Android/i.test(navigator.userAgent || ""); }

  function showError(t) {
    $("content").hidden = true;
    $("error").hidden = false;
    setText("error-title", t.errorTitle);
    setText("error-body", t.errorBody);
  }

  function applyCommon(t, lang) {
    document.documentElement.lang = lang;
    setText("promo-text", t.promo);
    setText("get-app", t.getApp);
    var getApp = $("get-app");
    if (getApp) getApp.href = PLAY_URL;
  }

  // ---------- ask page ----------

  function initAsk() {
    var p = readPayload();
    var o = p && p.obj;
    var id = o ? str(o.id) : "";
    var q = o ? truncate(str(o.q), MAX_Q) : "";
    var lang = pickLang(o ? o.l : null);
    var t = STRINGS[lang];
    applyCommon(t, lang);
    if (!o || !validId(id) || !q) { showError(t); return; }

    document.title = t.askTitle;
    var from = truncate(str(o.from), MAX_NAME) || t.someone;
    setText("asked-you", fmt(t.askedYou, from));
    setText("question", q);
    setText("name-label", t.yourName);
    setText("answer-label", t.yourAnswer);
    setText("send", t.send);

    var nameEl = $("name");
    var answerEl = $("answer");
    var counter = $("counter");
    var sendBtn = $("send");
    var notice = $("notice");
    nameEl.placeholder = t.namePlaceholder;
    nameEl.maxLength = MAX_NAME;
    answerEl.placeholder = t.answerPlaceholder;
    answerEl.maxLength = MAX_A;

    function update() {
      if (answerEl.value.length > MAX_A) answerEl.value = truncate(answerEl.value, MAX_A);
      counter.textContent = answerEl.value.length + " / " + MAX_A;
      sendBtn.disabled = !answerEl.value.trim();
    }
    answerEl.addEventListener("input", update);
    update();

    function showNotice(message, link) {
      notice.hidden = false;
      notice.textContent = "";
      var msg = document.createElement("div");
      msg.textContent = message;
      notice.appendChild(msg);
      if (link) {
        var input = document.createElement("input");
        input.type = "text";
        input.readOnly = true;
        input.value = link;
        input.setAttribute("aria-label", t.copyManual);
        input.addEventListener("focus", function () { input.select(); });
        notice.appendChild(input);
      }
    }

    function legacyCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    function copyFallback(text, url) {
      function done(ok) {
        if (ok) showNotice(t.copied, url);
        else showNotice(t.copyManual, url);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
      } else {
        done(legacyCopy(text));
      }
    }

    sendBtn.addEventListener("click", function () {
      var answer = truncate(answerEl.value.trim(), MAX_A);
      if (!answer) return;
      var by = truncate(nameEl.value.trim(), MAX_NAME) || t.someone;
      var payload = b64urlEncode(JSON.stringify({ v: 1, id: id, q: q, by: by, a: answer }));
      var url = BASE + "/r/#" + payload;
      var text = fmt(t.replyMessage, url);
      if (navigator.share) {
        navigator.share({ text: text }).then(function () {
          showNotice(t.shared, null);
        }, function (err) {
          // The user closed the share sheet: nothing to do. Anything else: fall back to copying.
          if (err && err.name === "AbortError") return;
          copyFallback(text, url);
        });
      } else {
        copyFallback(text, url);
      }
    });
  }

  // ---------- reply page ----------

  function initReply() {
    var p = readPayload();
    var o = p && p.obj;
    var lang = pickLang(null);
    var t = STRINGS[lang];
    applyCommon(t, lang);
    var id = o ? str(o.id) : "";
    var a = o ? truncate(str(o.a), MAX_A) : "";
    if (!o || !validId(id) || !a) { showError(t); return; }

    document.title = t.replyTitle;
    var by = truncate(str(o.by), MAX_NAME) || t.someone;
    var q = truncate(str(o.q), MAX_Q);
    setText("answered", fmt(t.answered, by));
    setText("question-label", t.question);
    setText("question", q);
    if (!q) $("question-card").hidden = true;
    setText("answer", a);
    setText("open-app", t.openApp);
    setText("open-hint", t.openHint);

    var open = $("open-app");
    if (isAndroid()) {
      // Chrome does not hand a same-site link to the app, so use an intent: URL with the Play Store as the
      // fallback. Data before the last "#Intent;" is the https URL including the #payload fragment.
      open.href = "intent://hyunjunghoon.github.io/dayframe/r/#" + p.raw +
        "#Intent;scheme=https;package=" + PACKAGE +
        ";S.browser_fallback_url=" + encodeURIComponent(PLAY_URL) + ";end";
    } else {
      open.href = BASE + "/r/#" + p.raw;
    }
  }

  // ---------- boot ----------

  function boot() {
    var page = document.body.getAttribute("data-page");
    if (page === "ask") initAsk();
    else if (page === "reply") initReply();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("hashchange", function () { location.reload(); });
})();
