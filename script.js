// ===============================================================
// PICTOPEDIA - Wikipedia Chatbot (Vanilla JS)
// ===============================================================

const STORAGE = {
  THEME: "pictopedia-theme",
  SESSIONS: "pictopedia-sessions",
  ACTIVE: "pictopedia-active-session",
  LANG: "pictopedia-language",
};

const el = {
  app: document.getElementById("app"),
  sidebar: document.getElementById("sidebar"),
  chatList: document.getElementById("chatList"),
  messages: document.getElementById("messages"),
  input: document.getElementById("promptInput"),
  sendBtn: document.getElementById("sendBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  themeBtn: document.getElementById("themeBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  menuBtn: document.getElementById("menuBtn"),
  mobileBackdrop: document.getElementById("mobileBackdrop"),
  micBtn: document.getElementById("micBtn"),
  languageSelect: document.getElementById("languageSelect"),
  suggestions: document.getElementById("suggestions"),
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
  renderChatList();
  renderMessages();
  bindEvents();
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function saveSessions() {
  localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(state.sessions));
  localStorage.setItem(STORAGE.ACTIVE, state.activeSessionId);
}

function loadSessions() {
  const raw = localStorage.getItem(STORAGE.SESSIONS);
  const active = localStorage.getItem(STORAGE.ACTIVE);

  if (!raw) return;

  try {
    state.sessions = JSON.parse(raw);
    state.activeSessionId = active;
  } catch {
    state.sessions = [];
    state.activeSessionId = null;
  }
}

function loadTheme() {
  const isDark = localStorage.getItem(STORAGE.THEME) === "dark";
  document.body.classList.toggle("dark", isDark);
  el.themeBtn.textContent = isDark ? "☀" : "🌙";
}

function loadLanguage() {
  const savedLang = localStorage.getItem(STORAGE.LANG);
  if (!savedLang) return;
  state.language = savedLang;
  el.languageSelect.value = savedLang;
}

function ensureSession() {
  if (!state.sessions.length) {
    createSession();
    return;
  }

  const activeFound = state.sessions.some((s) => s.id === state.activeSessionId);
  if (!activeFound) state.activeSessionId = state.sessions[0].id;
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
        text: "Hello! Ask me any question. I will fetch a Wikipedia summary for you.",
        title: "",
        image: "",
        link: "",
        query: "",
      },
    ],
  };

  state.sessions.unshift(session);
  state.activeSessionId = session.id;
  saveSessions();
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
  if (!firstUser) return "New Chat";
  return firstUser.text.slice(0, 38);
}

function sortedSessions() {
  return [...state.sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
}

function renderChatList() {
  const list = sortedSessions();
  el.chatList.innerHTML = "";

  list.forEach((s) => {
    const row = document.createElement("div");
    row.className = `chat-row ${s.id === state.activeSessionId ? "active" : ""}`;
    row.dataset.sessionId = s.id;

    row.innerHTML = `
      <div class="chat-row-head">
        <span class="chat-row-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
        <span class="chat-pin">${s.pinned ? "📌" : ""}</span>
      </div>
      <div class="chat-row-actions">
        <button class="action-btn" data-chat-action="rename" data-session-id="${s.id}">Rename</button>
        <button class="action-btn" data-chat-action="pin" data-session-id="${s.id}">${s.pinned ? "Unpin" : "Pin"}</button>
        <button class="action-btn" data-chat-action="share" data-session-id="${s.id}">Share</button>
        <button class="action-btn" data-chat-action="delete" data-session-id="${s.id}">Delete</button>
      </div>
    `;

    row.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-chat-action]");
      if (actionBtn) return;
      setActiveSession(s.id);
    });

    el.chatList.appendChild(row);
  });
}

function renderMessages() {
  const session = getActiveSession();
  if (!session) return;

  el.messages.innerHTML = "";

  session.messages.forEach((msg) => {
    el.messages.appendChild(buildMessageNode(msg));
  });

  autoScroll();
}

function buildMessageNode(msg) {
  const node = document.createElement("article");
  node.className = `msg ${msg.role}`;
  node.dataset.messageId = msg.id;

  if (msg.role === "user") {
    node.innerHTML = `
      <div class="user-line">
        <span>${escapeHtml(msg.text)}</span>
        <span class="user-time">${msg.time || ""}</span>
      </div>
      <div class="msg-actions">
        <button class="action-btn" data-msg-action="copy">Copy</button>
        <button class="action-btn" data-msg-action="edit">Edit</button>
        <button class="action-btn" data-msg-action="delete">Delete</button>
      </div>
    `;
    return node;
  }

  const title = msg.title ? `<h3 class="bot-title">${escapeHtml(msg.title)}</h3>` : "";
  const summaryText = escapeHtml(msg.text || "");
  const linkHtml = msg.link ? ` <a href="${msg.link}" target="_blank" rel="noopener noreferrer">Read full article</a>` : "";
  const imageHtml = msg.image ? `<img src="${msg.image}" alt="Wikipedia thumbnail" loading="lazy" />` : "";

  node.innerHTML = `
    ${title}
    <p class="bot-body">${summaryText}${linkHtml}</p>
    ${imageHtml}
    <div class="msg-actions">
      <button class="action-btn" data-msg-action="copy">Copy</button>
      <button class="action-btn" data-msg-action="regen">Regenerate</button>
      <button class="action-btn" data-msg-action="speak">Speak</button>
      <button class="action-btn" data-msg-action="delete">Delete</button>
    </div>
  `;

  return node;
}

function addMessage(role, data) {
  const session = getActiveSession();
  if (!session) return;

  const msg = {
    id: uid("m"),
    role,
    text: data.text || "",
    title: data.title || "",
    image: data.image || "",
    link: data.link || "",
    query: data.query || "",
    time: role === "user" ? timeNow() : "",
  };

  session.messages.push(msg);
  if (session.title === "New Chat") {
    session.title = sessionTitleFromFirstQuestion(session);
  }
  saveSessions();

  const node = buildMessageNode(msg);
  el.messages.appendChild(node);
  autoScroll();
  renderChatList();
}

function removeMessageById(messageId) {
  const session = getActiveSession();
  if (!session) return;
  session.messages = session.messages.filter((m) => m.id !== messageId);
  session.title = sessionTitleFromFirstQuestion(session);
  saveSessions();
  renderChatList();
  renderMessages();
}

async function handleSend() {
  const question = el.input.value.trim();
  hideSuggestions();

  if (!question) {
    addMessage("bot", { text: "Please type a question first." });
    return;
  }

  addMessage("user", { text: question });
  el.input.value = "";
  await fetchAndRenderBot(question);
}

async function fetchAndRenderBot(question) {
  showTyping();

  try {
    const data = await fetchSummary(question);
    hideTyping();

    if (!data || !data.extract) {
      addMessage("bot", { text: "I couldn't find a direct Wikipedia article. Try asking another question.", query: question });
      return;
    }

    addMessage("bot", {
      title: data.title || "",
      text: data.extract || "",
      image: data.thumbnail?.source || "",
      link: data.content_urls?.desktop?.page || `https://${state.language}.wikipedia.org/wiki/${encodeURIComponent(question)}`,
      query: question,
    });
  } catch (err) {
    hideTyping();
    addMessage("bot", { text: "I couldn't find a direct Wikipedia article. Try asking another question.", query: question });
  }
}

async function fetchSummary(query) {
  const directUrl = `https://${state.language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  let res = await fetch(directUrl);

  if (res.ok) return res.json();

  // Fallback: search best title and fetch summary from title.
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
  node.innerHTML = `<p class="bot-body">Thinking<span class="typing-dots"><span></span><span></span><span></span></span></p>`;
  state.typingNode = node;
  el.messages.appendChild(node);
  autoScroll();
}

function hideTyping() {
  if (!state.typingNode) return;
  state.typingNode.remove();
  state.typingNode = null;
}

function autoScroll() {
  el.messages.scrollTop = el.messages.scrollHeight;
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function findMessageById(messageId) {
  const session = getActiveSession();
  if (!session) return null;
  return session.messages.find((m) => m.id === messageId) || null;
}

async function onMessageAction(event) {
  const btn = event.target.closest("[data-msg-action]");
  if (!btn) return;

  const action = btn.dataset.msgAction;
  const card = btn.closest(".msg");
  if (!card) return;

  const msg = findMessageById(card.dataset.messageId);
  if (!msg) return;

  if (action === "copy") {
    const text = msg.role === "bot" ? `${msg.title ? msg.title + "\n" : ""}${msg.text}` : msg.text;
    copyText(text || "");
    return;
  }

  if (action === "delete") {
    removeMessageById(msg.id);
    return;
  }

  if (action === "edit" && msg.role === "user") {
    const edited = prompt("Edit your question:", msg.text);
    if (!edited || !edited.trim()) return;

    removeMessageById(msg.id);
    addMessage("user", { text: edited.trim() });
    await fetchAndRenderBot(edited.trim());
    return;
  }

  if (action === "regen" && msg.role === "bot") {
    const query = msg.query || (() => {
      const session = getActiveSession();
      const idx = session.messages.findIndex((m) => m.id === msg.id);
      for (let i = idx - 1; i >= 0; i--) {
        if (session.messages[i].role === "user") return session.messages[i].text;
      }
      return "";
    })();

    if (!query) return;
    await fetchAndRenderBot(query);
    return;
  }

  if (action === "speak" && msg.role === "bot") {
    speakText(`${msg.title ? msg.title + ". " : ""}${msg.text}`);
  }
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = state.language;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function onChatListAction(event) {
  const btn = event.target.closest("[data-chat-action]");
  if (!btn) return;

  event.stopPropagation();
  const action = btn.dataset.chatAction;
  const sessionId = btn.dataset.sessionId;
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  if (action === "rename") {
    const renamed = prompt("Rename chat:", session.title);
    if (!renamed || !renamed.trim()) return;
    session.title = renamed.trim();
  }

  if (action === "pin") {
    session.pinned = !session.pinned;
  }

  if (action === "delete") {
    const ok = confirm("Delete this chat permanently?");
    if (!ok) return;
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);

    if (!state.sessions.length) {
      createSession();
    } else if (state.activeSessionId === sessionId) {
      state.activeSessionId = sortedSessions()[0].id;
    }
  }

  if (action === "share") {
    const payload = {
      title: session.title,
      language: state.language,
      pinned: session.pinned,
      messages: session.messages,
    };
    const shareText = JSON.stringify(payload, null, 2);
    copyText(shareText);
    alert("Chat JSON copied to clipboard.");
  }

  saveSessions();
  renderChatList();
  renderMessages();
}

function toggleTheme() {
  const willDark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", willDark);
  localStorage.setItem(STORAGE.THEME, willDark ? "dark" : "light");
  el.themeBtn.textContent = willDark ? "☀" : "🌙";
}

function downloadChat() {
  const session = getActiveSession();
  if (!session || !session.messages.length) return;

  const lines = session.messages.map((m) => {
    const who = m.role === "user" ? "User" : "Bot";
    const body = m.role === "bot" ? `${m.title ? m.title + " - " : ""}${m.text}` : m.text;
    return `${who}: ${body}`;
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "chat"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    addMessage("bot", { text: "Speech-to-text is not supported in this browser." });
    return;
  }

  if (!state.recognition) {
    state.recognition = new SR();
    state.recognition.continuous = false;
    state.recognition.interimResults = false;
    state.recognition.onresult = (e) => {
      el.input.value = e.results[0][0].transcript;
      handleSend();
    };
  }

  state.recognition.lang = state.language;
  state.recognition.start();
}

function openMobileSidebar() {
  el.app.classList.add("sidebar-open");
}

function closeMobileSidebar() {
  if (window.innerWidth <= 760) {
    el.app.classList.remove("sidebar-open");
  }
}

function escapeHtml(text) {
  return (text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

async function onInputSuggestions() {
  const term = el.input.value.trim();
  if (term.length < 2) {
    hideSuggestions();
    return;
  }

  const url = `https://${state.language}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=6&namespace=0&format=json&origin=*`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.[1] || [];
    renderSuggestions(list);
  } catch {
    hideSuggestions();
  }
}

function renderSuggestions(items) {
  el.suggestions.innerHTML = "";
  if (!items.length) {
    hideSuggestions();
    return;
  }

  items.forEach((item) => {
    const option = document.createElement("div");
    option.className = "suggestion-item";
    option.textContent = item;
    option.addEventListener("click", () => {
      el.input.value = item;
      hideSuggestions();
      el.input.focus();
    });
    el.suggestions.appendChild(option);
  });

  el.suggestions.style.display = "block";
}

function hideSuggestions() {
  el.suggestions.style.display = "none";
  el.suggestions.innerHTML = "";
}

function bindEvents() {
  el.sendBtn.addEventListener("click", handleSend);
  el.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });
  el.input.addEventListener("input", debounce(onInputSuggestions, 300));

  el.newChatBtn.addEventListener("click", () => {
    createSession();
    renderChatList();
    renderMessages();
  });

  el.chatList.addEventListener("click", onChatListAction);
  el.messages.addEventListener("click", onMessageAction);

  el.themeBtn.addEventListener("click", toggleTheme);
  el.downloadBtn.addEventListener("click", downloadChat);
  el.micBtn.addEventListener("click", startMic);

  el.languageSelect.addEventListener("change", (e) => {
    state.language = e.target.value;
    localStorage.setItem(STORAGE.LANG, state.language);
    hideSuggestions();
  });

  el.menuBtn.addEventListener("click", openMobileSidebar);
  el.mobileBackdrop.addEventListener("click", closeMobileSidebar);
  window.addEventListener("resize", closeMobileSidebar);
}

init();
