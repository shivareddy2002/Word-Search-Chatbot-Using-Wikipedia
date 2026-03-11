// ===============================================================
// PICTOPEDIA - Wikipedia + AI-Style Chatbot (Vanilla JavaScript)
// ===============================================================

const STORAGE = {
  THEME: "pictopedia-theme",
  SESSIONS: "pictopedia-sessions",
  ACTIVE: "pictopedia-active-session",
  LANG: "pictopedia-language",
};

const els = {
  app: document.getElementById("app"),
  chatList: document.getElementById("chatList"),
  messages: document.getElementById("messages"),
  input: document.getElementById("promptInput"),
  searchStatus: document.getElementById("searchStatus"),
  conversationSearch: document.getElementById("conversationSearch"),
  sendBtn: document.getElementById("sendBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  themeBtn: document.getElementById("themeBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  pdfBtn: document.getElementById("pdfBtn"),
  menuBtn: document.getElementById("menuBtn"),
  mobileBackdrop: document.getElementById("mobileBackdrop"),
  micBtn: document.getElementById("micBtn"),
  languageSelect: document.getElementById("languageSelect"),
};

const state = {
  sessions: [],
  activeSessionId: null,
  language: "en",
  typingNode: null,
  recognition: null,
};

function init() {
  loadTheme();
  loadLanguage();
  loadSessions();
  ensureSession();
  bindEvents();
  renderChatList();
  renderMessages();
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  return (text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function copyText(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

function saveSessions() {
  localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(state.sessions));
  localStorage.setItem(STORAGE.ACTIVE, state.activeSessionId || "");
}

function loadSessions() {
  const raw = localStorage.getItem(STORAGE.SESSIONS);
  const active = localStorage.getItem(STORAGE.ACTIVE);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.sessions = Array.isArray(parsed) ? parsed : [];
    state.activeSessionId = active;
  } catch {
    state.sessions = [];
    state.activeSessionId = null;
  }
}

function loadTheme() {
  const isDark = localStorage.getItem(STORAGE.THEME) === "dark";
  document.body.classList.toggle("dark", isDark);
  els.themeBtn.textContent = isDark ? "☀" : "🌙";
}

function loadLanguage() {
  const lang = localStorage.getItem(STORAGE.LANG);
  if (!lang) return;
  state.language = lang;
  els.languageSelect.value = lang;
}

function createSession() {
  const session = {
    id: uid("session"),
    title: "New Chat",
    pinned: false,
    createdAt: Date.now(),
    messages: [
      {
        id: uid("m"),
        role: "bot",
        text: "Hello! Ask a question and I will fetch Wikipedia information for you.",
        title: "",
        image: "",
        link: "",
        query: "",
        time: "",
      },
    ],
  };

  state.sessions.unshift(session);
  state.activeSessionId = session.id;
  saveSessions();
}

function ensureSession() {
  if (!state.sessions.length) {
    createSession();
    return;
  }

  const valid = state.sessions.some((s) => s.id === state.activeSessionId);
  if (!valid) state.activeSessionId = state.sessions[0].id;
}

function getActiveSession() {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

function setActiveSession(sessionId) {
  state.activeSessionId = sessionId;
  saveSessions();
  renderChatList();
  renderMessages();
  closeMobileSidebar();
}

function sessionTitleFromFirstQuestion(session) {
  const firstUser = session.messages.find((m) => m.role === "user");
  return firstUser ? firstUser.text.slice(0, 40) : "New Chat";
}

function sortedSessions() {
  return [...state.sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
}

function renderChatList() {
  els.chatList.innerHTML = "";

  sortedSessions().forEach((session) => {
    const row = document.createElement("div");
    row.className = `chat-row ${session.id === state.activeSessionId ? "active" : ""}`;

    row.innerHTML = `
      <div class="chat-row-head">
        <span class="chat-row-title" title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</span>
        <span class="chat-pin">${session.pinned ? "📌" : ""}</span>
      </div>
      <div class="chat-row-actions">
        <button class="action-btn" data-chat-action="rename" data-session-id="${session.id}">Rename</button>
        <button class="action-btn" data-chat-action="pin" data-session-id="${session.id}">${session.pinned ? "Unpin" : "Pin"}</button>
        <button class="action-btn" data-chat-action="share" data-session-id="${session.id}">Share</button>
        <button class="action-btn" data-chat-action="delete" data-session-id="${session.id}">Delete</button>
      </div>
    `;

    row.addEventListener("click", (event) => {
      if (event.target.closest("[data-chat-action]")) return;
      setActiveSession(session.id);
    });

    els.chatList.appendChild(row);
  });
}

function onChatListAction(event) {
  const btn = event.target.closest("[data-chat-action]");
  if (!btn) return;

  event.stopPropagation();
  const sessionId = btn.dataset.sessionId;
  const action = btn.dataset.chatAction;
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  if (action === "rename") {
    const name = prompt("Rename chat:", session.title);
    if (name && name.trim()) session.title = name.trim();
  }

  if (action === "pin") {
    session.pinned = !session.pinned;
  }

  if (action === "share") {
    const payload = {
      title: session.title,
      language: state.language,
      pinned: session.pinned,
      messages: session.messages,
    };
    copyText(JSON.stringify(payload, null, 2));
    alert("Chat JSON copied to clipboard.");
  }

  if (action === "delete") {
    if (!confirm("Delete this chat permanently?")) return;
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);

    if (!state.sessions.length) {
      createSession();
    } else if (state.activeSessionId === sessionId) {
      state.activeSessionId = sortedSessions()[0].id;
    }
  }

  saveSessions();
  renderChatList();
  renderMessages();
}

function addMessage(role, payload) {
  const session = getActiveSession();
  if (!session) return;

  const message = {
    id: uid("m"),
    role,
    text: payload.text || "",
    title: payload.title || "",
    image: payload.image || "",
    link: payload.link || "",
    query: payload.query || "",
    time: role === "user" ? timeNow() : "",
  };

  session.messages.push(message);
  if (session.title === "New Chat" && role === "user") {
    session.title = sessionTitleFromFirstQuestion(session);
  }

  saveSessions();
  els.messages.appendChild(buildMessageNode(message));
  renderChatList();
  autoScroll();
}

function renderMessages() {
  const session = getActiveSession();
  if (!session) return;

  els.messages.innerHTML = "";
  session.messages.forEach((msg) => {
    els.messages.appendChild(buildMessageNode(msg));
  });
  if (els.conversationSearch.value.trim()) runConversationSearch();
  autoScroll();
}

function renderRichText(text) {
  const withLinks = escapeHtml(text).replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return `<p class="bot-body">${withLinks.replace(/\n/g, "<br>")}</p>`;
}

function buildMessageNode(message) {
  const article = document.createElement("article");
  article.className = `msg ${message.role}`;
  article.dataset.messageId = message.id;

  if (message.role === "user") {
    article.innerHTML = `
      <div class="user-line">
        <span>${escapeHtml(message.text)}</span>
        <span class="user-time">${message.time}</span>
      </div>
      <div class="msg-actions">
        <button class="action-btn" data-msg-action="copy">Copy</button>
        <button class="action-btn" data-msg-action="edit">Edit</button>
        <button class="action-btn" data-msg-action="delete">Delete</button>
      </div>
    `;
    return article;
  }

  const titleHTML = message.title ? `<h3 class="bot-title">${escapeHtml(message.title)}</h3>` : "";
  const wikiBody = renderRichText(message.text || "");
  const readLink = message.link
    ? ` <a href="${message.link}" target="_blank" rel="noopener noreferrer">Read full article</a>`
    : "";
  const imageHTML = message.image ? `<img src="${message.image}" alt="Wikipedia preview image" loading="lazy" />` : "";

  article.innerHTML = `
    ${titleHTML}
    <p class="bot-section-label">Wikipedia Summary</p>
    ${wikiBody}
    <p class="bot-body">${readLink}</p>
    ${imageHTML}
    <div class="msg-actions">
      <button class="action-btn" data-msg-action="copy">Copy</button>
      <button class="action-btn" data-msg-action="speak">Speak</button>
      <button class="action-btn" data-msg-action="delete">Delete</button>
    </div>
  `;

  return article;
}

function onMessageAction(event) {
  const btn = event.target.closest("[data-msg-action]");
  if (!btn) return;

  const action = btn.dataset.msgAction;
  const card = btn.closest(".msg");
  if (!card) return;

  const messageId = card.dataset.messageId;
  const session = getActiveSession();
  if (!session) return;

  const msg = session.messages.find((m) => m.id === messageId);
  if (!msg) return;

  if (action === "copy") {
    const text = [msg.title, msg.text].filter(Boolean).join("\n\n");
    copyText(text || msg.text);
    return;
  }

  if (action === "speak") {
    speakText(msg.text || msg.title);
    return;
  }

  if (action === "edit") {
    if (msg.role !== "user") return;
    const edited = prompt("Edit your message:", msg.text);
    if (!edited || !edited.trim()) return;
    msg.text = edited.trim();
    saveSessions();
    renderMessages();
    return;
  }

  if (action === "delete") {
    session.messages = session.messages.filter((m) => m.id !== messageId);
    if (!session.messages.length) {
      session.messages.push({
        id: uid("m"),
        role: "bot",
        text: "This chat is empty now. Ask something to continue.",
        title: "",
        image: "",
        link: "",
        query: "",
        time: "",
      });
    }
    saveSessions();
    renderMessages();
  }
}

async function handleSend() {
  const question = els.input.value.trim();
  if (!question) return;

  hideSuggestions();
  addMessage("user", { text: question });
  els.input.value = "";

  await fetchAndRenderBot(question);
}

async function fetchAndRenderBot(question) {
  showTyping();

  try {
    const data = await fetchSummary(question);
    hideTyping();

    if (!data?.extract) {
      addMessage("bot", {
        text: "I couldn't find a direct Wikipedia article. Try asking another question.",
        query: question,
      });
      return;
    }

    addMessage("bot", {
      title: data.title || "",
      text: data.extract,
      image: data.thumbnail?.source || "",
      link: data.content_urls?.desktop?.page || `https://${state.language}.wikipedia.org/wiki/${encodeURIComponent(question)}`,
      query: question,
    });
  } catch {
    hideTyping();
    addMessage("bot", {
      text: "I couldn't find a direct Wikipedia article. Try asking another question.",
      query: question,
    });
  }
}

async function fetchSummary(query) {
  const summaryUrl = `https://${state.language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  let res = await fetch(summaryUrl);
  if (res.ok) return res.json();

  const searchUrl = `https://${state.language}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error("search_failed");

  const searchData = await searchRes.json();
  const bestTitle = searchData?.[1]?.[0];
  if (!bestTitle) throw new Error("not_found");

  const titleUrl = `https://${state.language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
  res = await fetch(titleUrl);
  if (!res.ok) throw new Error("not_found");

  return res.json();
}

function showTyping() {
  if (state.typingNode) return;

  const node = document.createElement("article");
  node.className = "msg bot";
  node.innerHTML = '<p class="bot-body">Thinking<span class="typing-dots"><span></span><span></span><span></span></span></p>';
  state.typingNode = node;
  els.messages.appendChild(node);
  autoScroll();
}

function hideTyping() {
  if (!state.typingNode) return;
  state.typingNode.remove();
  state.typingNode = null;
}

function autoScroll() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function runConversationSearch() {
  const term = els.conversationSearch.value.trim().toLowerCase();
  const cards = Array.from(els.messages.querySelectorAll(".msg"));

  cards.forEach((card) => card.classList.remove("highlight"));
  if (!term) {
    els.searchStatus.textContent = "";
    return;
  }

  const matches = cards.filter((card) => card.textContent.toLowerCase().includes(term));
  matches.forEach((card) => card.classList.add("highlight"));

  if (!matches.length) {
    els.searchStatus.textContent = "No messages found";
    return;
  }

  els.searchStatus.textContent = `${matches.length} message${matches.length > 1 ? "s" : ""} found`;
  matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
}

function speakText(text) {
  if (!("speechSynthesis" in window) || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = state.language;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function startMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addMessage("bot", { text: "Speech-to-text is not supported in this browser." });
    return;
  }

  if (!state.recognition) {
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = false;
    state.recognition.onresult = (e) => {
      els.input.value = e.results[0][0].transcript;
      handleSend();
    };
  }

  state.recognition.lang = state.language;
  state.recognition.start();
}

function downloadChatAsTXT() {
  const session = getActiveSession();
  if (!session) return;

  const lines = session.messages.map((m) => {
    if (m.role === "user") return `User: ${m.text}`;
    return `Bot: ${m.title ? `${m.title} - ` : ""}${m.text}`;
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(session.title)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportChatAsPDF() {
  const session = getActiveSession();
  if (!session) return;

  const now = new Date().toLocaleString();
  const lines = [
    `Chat Title: ${session.title}`,
    `Date: ${now}`,
    "",
    ...session.messages.map((m) => `${m.role === "user" ? "User" : "Bot"}: ${m.title ? `${m.title} - ` : ""}${m.text}`),
  ];

  const pdfBytes = createSimplePDF(lines);
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(session.title)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function createSimplePDF(lines) {
  const escaped = lines.map((line) => line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"));
  const content = ["BT", "/F1 12 Tf", "50 780 Td"];

  escaped.forEach((line, index) => {
    if (index > 0) content.push("0 -16 Td");
    content.push(`(${line}) Tj`);
  });
  content.push("ET");

  const stream = content.join("\n");
  const objects = [];
  const addObj = (str) => {
    objects.push(str);
    return objects.length;
  };

  const fontObj = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const contentObj = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  const pageObj = addObj(`<< /Type /Page /Parent 4 0 R /MediaBox [0 0 595 842] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >>`);
  const pagesObj = addObj(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`);
  const catalogObj = addObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  let body = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((off) => {
    body += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(body);
}

function sanitizeFilename(name) {
  return (name || "chat").replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

function toggleTheme() {
  const dark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", dark);
  localStorage.setItem(STORAGE.THEME, dark ? "dark" : "light");
  els.themeBtn.textContent = dark ? "☀" : "🌙";
}

function openMobileSidebar() {
  els.app.classList.add("sidebar-open");
}

function closeMobileSidebar() {
  if (window.innerWidth <= 760) {
    els.app.classList.remove("sidebar-open");
  }
}

function bindEvents() {
  els.sendBtn.addEventListener("click", handleSend);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });

  els.newChatBtn.addEventListener("click", () => {
    createSession();
    renderChatList();
    renderMessages();
  });

  els.chatList.addEventListener("click", onChatListAction);
  els.messages.addEventListener("click", onMessageAction);
  els.conversationSearch.addEventListener("input", debounce(runConversationSearch, 120));

  els.themeBtn.addEventListener("click", toggleTheme);
  els.downloadBtn.addEventListener("click", downloadChatAsTXT);
  els.pdfBtn.addEventListener("click", exportChatAsPDF);
  els.micBtn.addEventListener("click", startMic);

  els.languageSelect.addEventListener("change", (e) => {
    state.language = e.target.value;
    localStorage.setItem(STORAGE.LANG, state.language);
  });

  els.menuBtn.addEventListener("click", openMobileSidebar);
  els.mobileBackdrop.addEventListener("click", closeMobileSidebar);
  window.addEventListener("resize", closeMobileSidebar);
}

init();
