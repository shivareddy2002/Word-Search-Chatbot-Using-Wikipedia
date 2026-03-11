// PICTOPEDIA Chatbot
// Built with HTML, CSS, and Vanilla JS (ES6)

const STORAGE_KEYS = {
  theme: "pictopedia-theme",
  chat: "pictopedia-chat-history",
};

const elements = {
  chatMessages: document.getElementById("chatMessages"),
  userInput: document.getElementById("userInput"),
  sendBtn: document.getElementById("sendBtn"),
  micBtn: document.getElementById("micBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  languageSelect: document.getElementById("languageSelect"),
  themeToggle: document.getElementById("themeToggle"),
  suggestions: document.getElementById("suggestions"),
};

const state = {
  chatHistory: [],
  typingNode: null,
  activeLanguage: "en",
  recognition: null,
};

function init() {
  setupTheme();
  setupEvents();
  loadChatHistory();
  addWelcomeMessage();
}

function setupTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    elements.themeToggle.checked = true;
  }
}

function setupEvents() {
  elements.sendBtn.addEventListener("click", onSendMessage);
  elements.userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") onSendMessage();
  });

  elements.userInput.addEventListener("input", debounce(onInputSuggestion, 300));

  elements.languageSelect.addEventListener("change", (event) => {
    state.activeLanguage = event.target.value;
    hideSuggestions();
  });

  elements.themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", elements.themeToggle.checked);
    localStorage.setItem(STORAGE_KEYS.theme, elements.themeToggle.checked ? "dark" : "light");
  });

  elements.downloadBtn.addEventListener("click", downloadChatHistory);
  elements.micBtn.addEventListener("click", startVoiceInput);
}

function addWelcomeMessage() {
  if (state.chatHistory.length > 0) return;
  const text = "Hi! I am PICTOPEDIA 🤖. Ask me any topic and I will fetch a Wikipedia summary for you.";
  addMessage("bot", { text });
}

function onSendMessage() {
  const query = elements.userInput.value.trim();
  hideSuggestions();

  if (!query) {
    addMessage("bot", { text: "Please type or speak a topic before sending." });
    return;
  }

  addMessage("user", { text: query });
  elements.userInput.value = "";
  getWikipediaSummary(query);
}

async function getWikipediaSummary(query) {
  showTypingIndicator();
  const apiUrl = `https://${state.activeLanguage}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("not_found");
      }
      throw new Error("api_error");
    }

    const data = await response.json();
    hideTypingIndicator();

    if (!data.extract) {
      addMessage("bot", { text: "Sorry, I couldn't find information about that topic." });
      return;
    }

    addMessage("bot", {
      title: data.title,
      text: data.extract,
      image: data.thumbnail?.source || "",
      link: data.content_urls?.desktop?.page || `https://${state.activeLanguage}.wikipedia.org/wiki/${encodeURIComponent(query)}`,
      speakText: `${data.title}. ${data.extract}`,
    });
  } catch (error) {
    hideTypingIndicator();
    if (error.message === "not_found") {
      addMessage("bot", { text: "Sorry, I couldn't find information about that topic." });
      return;
    }

    addMessage("bot", {
      text: "I couldn't connect to Wikipedia right now. Please check your internet connection and try again.",
    });
  }
}

function addMessage(sender, payload) {
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const messageData = {
    sender,
    timestamp,
    ...payload,
  };

  state.chatHistory.push(messageData);
  saveChatHistory();

  const messageNode = buildMessageNode(messageData);
  elements.chatMessages.appendChild(messageNode);
  autoScroll();
}

function buildMessageNode(message) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${message.sender}`;

  const top = document.createElement("div");
  top.className = "message-top";

  const left = document.createElement("span");
  left.className = message.sender === "bot" ? "bot-badge" : "";
  left.textContent = message.sender === "bot" ? "🤖 PICTOPEDIA" : "You";

  const time = document.createElement("time");
  time.textContent = message.timestamp;

  top.append(left, time);
  wrapper.appendChild(top);

  if (message.title) {
    const title = document.createElement("h3");
    title.textContent = message.title;
    wrapper.appendChild(title);
  }

  if (message.text) {
    const text = document.createElement("p");
    text.textContent = message.text;
    wrapper.appendChild(text);
  }

  if (message.image) {
    const image = document.createElement("img");
    image.src = message.image;
    image.alt = message.title || "Wikipedia thumbnail";
    image.loading = "lazy";
    wrapper.appendChild(image);
  }

  if (message.link) {
    const link = document.createElement("a");
    link.href = message.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Read more on Wikipedia";
    wrapper.appendChild(link);
  }

  if (message.sender === "bot" && message.speakText) {
    const actions = document.createElement("div");
    actions.className = "bot-actions";

    const speakBtn = document.createElement("button");
    speakBtn.className = "speak-btn";
    speakBtn.type = "button";
    speakBtn.title = "Speak this response";
    speakBtn.textContent = "🔊";
    speakBtn.addEventListener("click", () => speakText(message.speakText));

    actions.appendChild(speakBtn);
    wrapper.appendChild(actions);
  }

  return wrapper;
}

function showTypingIndicator() {
  if (state.typingNode) return;

  state.typingNode = document.createElement("article");
  state.typingNode.className = "message bot";
  state.typingNode.innerHTML = `
    <div class="message-top">
      <span class="bot-badge">🤖 PICTOPEDIA</span>
      <time>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
    </div>
    <p>Bot is typing <span class="typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span></p>
  `;

  elements.chatMessages.appendChild(state.typingNode);
  autoScroll();
}

function hideTypingIndicator() {
  if (!state.typingNode) return;
  state.typingNode.remove();
  state.typingNode = null;
}

function autoScroll() {
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    addMessage("bot", { text: "Text-to-speech is not supported in this browser." });
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.activeLanguage;
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    addMessage("bot", { text: "Speech recognition is not supported in this browser." });
    return;
  }

  if (!state.recognition) {
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = false;

    state.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      elements.userInput.value = transcript;
      onSendMessage();
    };

    state.recognition.onerror = () => {
      addMessage("bot", { text: "I couldn't hear clearly. Please try the microphone again." });
    };
  }

  state.recognition.lang = state.activeLanguage;
  state.recognition.start();
}

async function onInputSuggestion(event) {
  const term = event.target.value.trim();
  if (term.length < 2) {
    hideSuggestions();
    return;
  }

  const url = `https://${state.activeLanguage}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=6&namespace=0&format=json&origin=*`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const suggestions = data[1] || [];
    renderSuggestions(suggestions);
  } catch {
    hideSuggestions();
  }
}

function renderSuggestions(items) {
  elements.suggestions.innerHTML = "";
  if (!items.length) {
    hideSuggestions();
    return;
  }

  items.forEach((item) => {
    const option = document.createElement("div");
    option.className = "suggestion-item";
    option.textContent = item;
    option.addEventListener("click", () => {
      elements.userInput.value = item;
      hideSuggestions();
      elements.userInput.focus();
    });
    elements.suggestions.appendChild(option);
  });

  elements.suggestions.style.display = "block";
}

function hideSuggestions() {
  elements.suggestions.style.display = "none";
  elements.suggestions.innerHTML = "";
}

function saveChatHistory() {
  localStorage.setItem(STORAGE_KEYS.chat, JSON.stringify(state.chatHistory));
}

function loadChatHistory() {
  const saved = localStorage.getItem(STORAGE_KEYS.chat);
  if (!saved) return;

  try {
    state.chatHistory = JSON.parse(saved);
    state.chatHistory.forEach((entry) => {
      const node = buildMessageNode(entry);
      elements.chatMessages.appendChild(node);
    });
    autoScroll();
  } catch {
    state.chatHistory = [];
  }
}

function downloadChatHistory() {
  if (!state.chatHistory.length) {
    addMessage("bot", { text: "No chat history available to download yet." });
    return;
  }

  const lines = state.chatHistory.map((msg) => {
    const name = msg.sender === "user" ? "User" : "Bot";
    const core = msg.title ? `${msg.title} - ${msg.text || ""}` : msg.text || "";
    return `${name}: ${core}`;
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pictopedia-chat-history.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

function debounce(callback, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}

init();
