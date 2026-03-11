// ============================================================
// PICTOPEDIA - Word Search Chatbot Using Wikipedia API
// Vanilla JavaScript (ES6)
// ============================================================

const STORAGE_KEYS = {
  theme: "pictopedia-theme",
  sessions: "pictopedia-sessions",
  activeSessionId: "pictopedia-active-session-id",
};

const elements = {
  appLayout: document.getElementById("appLayout"),
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("overlay"),
  menuBtn: document.getElementById("menuBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  sessionList: document.getElementById("chatSessionList"),
  chatMessages: document.getElementById("chatMessages"),
  userInput: document.getElementById("userInput"),
  sendBtn: document.getElementById("sendBtn"),
  micBtn: document.getElementById("micBtn"),
  themeBtn: document.getElementById("themeBtn"),
  languageSelect: document.getElementById("languageSelect"),
  downloadBtn: document.getElementById("downloadBtn"),
};

const state = {
  language: "en",
  sessions: [],
  activeSessionId: null,
  typingNode: null,
  recognition: null,
};

function init() {
  loadTheme();
  loadSessions();
  bindEvents();
  ensureSession();
  renderSessionList();
  renderActiveSessionMessages();
}

// ------------------- Initial Data -------------------
function loadTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  elements.themeBtn.textContent = dark ? "☀" : "🌙";
}

function loadSessions() {
  const savedSessions = localStorage.getItem(STORAGE_KEYS.sessions);
  const savedActiveId = localStorage.getItem(STORAGE_KEYS.activeSessionId);

  if (savedSessions) {
    try {
      state.sessions = JSON.parse(savedSessions);
      state.activeSessionId = savedActiveId;
    } catch {
      state.sessions = [];
      state.activeSessionId = null;
    }
  }
}

function ensureSession() {
  if (!state.sessions.length) {
    createNewSession();
    return;
  }

  const exists = state.sessions.some((session) => session.id === state.activeSessionId);
  if (!exists) {
    state.activeSessionId = state.sessions[0].id;
  }
}

function persistSessions() {
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(state.sessions));
  localStorage.setItem(STORAGE_KEYS.activeSessionId, state.activeSessionId);
}

// ------------------- Session Handling -------------------
function createNewSession() {
  const id = `session-${Date.now()}`;
  const newSession = {
    id,
    title: "New Chat",
    createdAt: new Date().toISOString(),
    messages: [
      {
        sender: "bot",
        timestamp: getTimeStamp(),
        text: "Hello! Ask any word or topic and I will fetch data from Wikipedia.",
      },
    ],
  };

  state.sessions.unshift(newSession);
  state.activeSessionId = id;
  persistSessions();
  renderSessionList();
  renderActiveSessionMessages();
}

function getActiveSession() {
  return state.sessions.find((session) => session.id === state.activeSessionId);
}

function setActiveSession(sessionId) {
  state.activeSessionId = sessionId;
  persistSessions();
  renderSessionList();
  renderActiveSessionMessages();
}

function renderSessionList() {
  elements.sessionList.innerHTML = "";

  state.sessions.forEach((session) => {
    const item = document.createElement("li");
    item.className = `chat-session-item ${session.id === state.activeSessionId ? "active" : ""}`;
    item.textContent = session.title;
    item.title = session.title;
    item.addEventListener("click", () => {
      setActiveSession(session.id);
      closeSidebarOnMobile();
    });
    elements.sessionList.appendChild(item);
  });
}

function renderActiveSessionMessages() {
  elements.chatMessages.innerHTML = "";
  const session = getActiveSession();
  if (!session) return;

  session.messages.forEach((msg) => {
    elements.chatMessages.appendChild(createMessageElement(msg));
  });

  autoScroll();
}

function updateSessionTitleFromFirstUserMessage(session) {
  const firstUserMsg = session.messages.find((msg) => msg.sender === "user");
  if (!firstUserMsg) return;
  session.title = firstUserMsg.text.slice(0, 34) || "New Chat";
}

// ------------------- Messaging -------------------
function addMessage(sender, payload) {
  const session = getActiveSession();
  if (!session) return;

  const message = {
    sender,
    timestamp: getTimeStamp(),
    ...payload,
  };

  session.messages.push(message);
  updateSessionTitleFromFirstUserMessage(session);
  persistSessions();

  elements.chatMessages.appendChild(createMessageElement(message));
  renderSessionList();
  autoScroll();
}

function createMessageElement(message) {
  const article = document.createElement("article");
  article.className = `message ${message.sender}`;

  const top = document.createElement("div");
  top.className = "message-top";
  top.innerHTML = `<span>${message.sender === "user" ? "You" : "PICTOPEDIA"}</span><time>${message.timestamp}</time>`;
  article.appendChild(top);

  if (message.title) {
    const title = document.createElement("h3");
    title.textContent = message.title;
    article.appendChild(title);
  }

  if (message.text) {
    const p = document.createElement("p");
    p.textContent = message.text;
    article.appendChild(p);
  }

  if (message.image) {
    const img = document.createElement("img");
    img.src = message.image;
    img.alt = message.title || "Wikipedia image";
    img.loading = "lazy";
    article.appendChild(img);
  }

  if (message.link) {
    const link = document.createElement("a");
    link.href = message.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Read full article";
    article.appendChild(link);
  }

  return article;
}

async function sendMessage() {
  const query = elements.userInput.value.trim();

  if (!query) {
    addMessage("bot", { text: "Please type a word before searching." });
    return;
  }

  addMessage("user", { text: query });
  elements.userInput.value = "";

  showTyping();

  try {
    const data = await fetchWikipediaSummary(query);
    hideTyping();

    if (!data?.extract) {
      addMessage("bot", { text: "Sorry, I couldn't find information about that topic." });
      return;
    }

    addMessage("bot", {
      title: data.title,
      text: data.extract,
      image: data.thumbnail?.source || "",
      link: data.content_urls?.desktop?.page || `https://${state.language}.wikipedia.org/wiki/${encodeURIComponent(query)}`,
    });
  } catch (error) {
    hideTyping();

    if (error.message === "not_found") {
      addMessage("bot", { text: "Sorry, I couldn't find information about that topic." });
    } else {
      addMessage("bot", { text: "Network issue. Please check your internet and try again." });
    }
  }
}

async function fetchWikipediaSummary(searchTerm) {
  const url = `https://${state.language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;
  const response = await fetch(url);

  if (response.status === 404) {
    throw new Error("not_found");
  }

  if (!response.ok) {
    throw new Error("api_error");
  }

  return response.json();
}

function showTyping() {
  if (state.typingNode) return;

  const node = document.createElement("article");
  node.className = "message bot";
  node.innerHTML = `
    <div class="message-top">
      <span>PICTOPEDIA</span>
      <time>${getTimeStamp()}</time>
    </div>
    <p>Typing <span class="typing-dots"><span></span><span></span><span></span></span></p>
  `;

  state.typingNode = node;
  elements.chatMessages.appendChild(node);
  autoScroll();
}

function hideTyping() {
  if (!state.typingNode) return;
  state.typingNode.remove();
  state.typingNode = null;
}

function autoScroll() {
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function getTimeStamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ------------------- Extra Features -------------------
function toggleTheme() {
  const isDark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", isDark);
  elements.themeBtn.textContent = isDark ? "☀" : "🌙";
  localStorage.setItem(STORAGE_KEYS.theme, isDark ? "dark" : "light");
}

function downloadCurrentChat() {
  const session = getActiveSession();
  if (!session || !session.messages.length) {
    addMessage("bot", { text: "Nothing to download yet." });
    return;
  }

  const content = session.messages
    .map((msg) => `${msg.sender === "user" ? "User" : "Bot"}: ${msg.title ? `${msg.title} - ` : ""}${msg.text || ""}`)
    .join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "chat"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function startSpeechToText() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addMessage("bot", { text: "Speech-to-text is not supported in this browser." });
    return;
  }

  if (!state.recognition) {
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = false;
    state.recognition.onresult = (event) => {
      elements.userInput.value = event.results[0][0].transcript;
      sendMessage();
    };
  }

  state.recognition.lang = state.language;
  state.recognition.start();
}

// ------------------- Responsive Sidebar -------------------
function toggleSidebar() {
  elements.appLayout.classList.toggle("sidebar-open");
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 760) {
    elements.appLayout.classList.remove("sidebar-open");
  }
}

// ------------------- Events -------------------
function bindEvents() {
  elements.sendBtn.addEventListener("click", sendMessage);
  elements.userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
  });

  elements.newChatBtn.addEventListener("click", createNewSession);
  elements.themeBtn.addEventListener("click", toggleTheme);
  elements.downloadBtn.addEventListener("click", downloadCurrentChat);
  elements.micBtn.addEventListener("click", startSpeechToText);

  elements.languageSelect.addEventListener("change", (event) => {
    state.language = event.target.value;
  });

  elements.menuBtn.addEventListener("click", toggleSidebar);
  elements.overlay.addEventListener("click", closeSidebarOnMobile);

  window.addEventListener("resize", closeSidebarOnMobile);
}

init();
