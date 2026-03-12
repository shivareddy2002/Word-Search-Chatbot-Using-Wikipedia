// ===============================================================
// WORD SEARCH CHAT BOT - Wikipedia + Conversational Assistant (Vanilla JavaScript)
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
  menuBtn: document.getElementById("menuBtn"),
  mobileBackdrop: document.getElementById("mobileBackdrop"),
  micBtn: document.getElementById("micBtn"),
  languageSelect: document.getElementById("languageSelect"),
  suggestionTray: document.getElementById("suggestionTray"),
};
const state = {
  sessions: [],
  activeSessionId: null,
  language: "en",
  typingNode: null,
  recognition: null,
  isMicListening: false,
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
    showImage: Boolean(payload.showImage),
    showLink: Boolean(payload.showLink),
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
  maybeShowSuggestions();
  autoScroll();
}
function hideSuggestions() {
  els.suggestionTray?.classList.add("hidden");
}
function maybeShowSuggestions() {
  const session = getActiveSession();
  if (!session) return;
  const hasOnlyWelcome = session.messages.length <= 1;
  els.suggestionTray?.classList.toggle("hidden", !hasOnlyWelcome);
}
function renderRichTextInline(text) {
  const withLinks = escapeHtml(text).replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return withLinks.split("\n").join("<br>");
}
function userAskedForImage(question) {
  return /(show|send|include|add|share).*(image|photo|picture|pic)|\b(image|photo|picture|pic)\b/i.test(question);
}
function userAskedForArticleLink(question) {
  return /(read|open|share|send|give).*(article|link|source|wikipedia)|\b(article|link|source)\b/i.test(question);
}
function getConversationalReply(question) {
  const clean = question.trim().toLowerCase();

  if (/^(hi|hello|hey|hii|hola)\b/.test(clean)) {
    return "Hi!  😊 How are you doing today? If you want, I can also help you explore any topic in detail.";
  }

  if (/how are you|how r u|how're you/.test(clean)) {
    return "I’m doing great and ready to help. Tell me what you want to learn, and I’ll give you a clear and detailed explanation.";
  }

  if (/^(thanks|thank you|thx)\b/.test(clean)) {
    return "You’re very welcome! I’m glad that helped. If you want, we can go deeper into the same topic or move to a new one.";
  }

  if (/^(bye|goodbye|see you)\b/.test(clean)) {
    return "Goodbye! It was great chatting with you. Have a wonderful day, and come back anytime.";
  }

  return "";
}

function buildAnswerText(question, extract, details = "") {
  const cleanedExtract = (extract || "").trim();
  const cleanedDetails = (details || "").trim();

  if (!cleanedExtract && !cleanedDetails) {
    return "I could not find enough details for that topic. Please try rephrasing your question.";
  }

  const toneLead = /^(who|what|when|where|why|how|tell me|explain|describe)\b/i.test(question.trim())
    ? "Great question. "
    : "Sure. ";

  if (!cleanedDetails) {
    return `${toneLead}${cleanedExtract}`;
  }

  return `${toneLead}${cleanedExtract}

More details:
${cleanedDetails}`;
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
  const answerText = renderRichTextInline(message.text || "");
  const readLink = message.link && message.showLink
    ? ` <a href="${message.link}" target="_blank" rel="noopener noreferrer">Read article</a>`
    : "";
  const imageHTML = message.image && message.showImage
    ? `<img src="${message.image}" alt="Wikipedia preview image" loading="lazy" />`
    : "";
  article.innerHTML = `
    <p class="bot-body">${answerText}${readLink}</p>
    ${imageHTML}
    <div class="msg-actions">
      <button class="action-btn" data-msg-action="copy">Copy</button>
      <button class="action-btn" data-msg-action="speak">Speak</button>
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
  const conversationalReply = getConversationalReply(question);
  if (conversationalReply) {
    addMessage("bot", { text: conversationalReply, query: question });
    return;
  }
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
    const details = await fetchDetailedExtract(data.title || question);

    addMessage("bot", {
      title: "",
      text: buildAnswerText(question, data.extract, details),
      image: data.thumbnail?.source || "",
      link: data.content_urls?.desktop?.page || `https://${state.language}.wikipedia.org/wiki/${encodeURIComponent(question)}`,
      showImage: userAskedForImage(question),
      showLink: userAskedForArticleLink(question),
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

async function fetchDetailedExtract(title) {
  const detailsUrl = `https://${state.language}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*&titles=${encodeURIComponent(title)}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) return "";

  const detailsData = await detailsRes.json();
  const pages = detailsData?.query?.pages || {};
  const firstPage = Object.values(pages)[0];
  const fullText = (firstPage?.extract || "").trim();
  if (!fullText) return "";

  const sentences = fullText.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 12).join(" ");
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
    addMessage("bot", {
      text: "Your browser does not support speech-to-text. Please use Chrome, Edge, or another supported browser.",
    });
    return;
  }

  if (!window.isSecureContext) {
    addMessage("bot", {
      text: "Microphone access needs a secure page (HTTPS or localhost). Please open this app on localhost or HTTPS and try again.",
    });
    return;
  }
  if (!state.recognition) {
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = false;

    state.recognition.onstart = () => {
      state.isMicListening = true;
      els.micBtn.textContent = "⏹️";
      els.micBtn.title = "Stop listening";
    };

    state.recognition.onend = () => {
      state.isMicListening = false;
      els.micBtn.textContent = "🎙️";
      els.micBtn.title = "Speech to text";
    };

    state.recognition.onerror = (event) => {
      const reason = event?.error || "unknown error";
      addMessage("bot", { text: `I could not capture your voice input (${reason}). Please allow microphone permission and try again.` });
    };

    state.recognition.onresult = (e) => {
      const transcript = e?.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      els.input.value = transcript;
      handleSend();
    };
  }
  state.recognition.lang = state.language;

  if (state.isMicListening) {
    state.recognition.stop();
    return;
  }

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
  els.micBtn.addEventListener("click", startMic);
  els.languageSelect.addEventListener("change", (e) => {
    state.language = e.target.value;
    localStorage.setItem(STORAGE.LANG, state.language);
  });
  els.menuBtn.addEventListener("click", openMobileSidebar);
  els.mobileBackdrop.addEventListener("click", closeMobileSidebar);
  window.addEventListener("resize", closeMobileSidebar);
  els.suggestionTray?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-suggestion]");
    if (!btn) return;
    els.input.value = btn.dataset.suggestion;
    handleSend();
  });
}
init();
