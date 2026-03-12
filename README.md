<!-- # PICTOPEDIA — Wikipedia Search Chatbot

PICTOPEDIA is a modern, client-side Wikipedia chatbot built with **HTML, CSS, and JavaScript**.
It provides a polished chat experience with multi-session history, language support, voice input, and export options.

## ✨ Highlights

- Professional glassmorphism-based UI with light/dark theme.
- Wikipedia summary search with fallback query resolution.
- Multi-chat sidebar with rename, pin, share, and delete actions.
- In-chat search and quick suggestion chips for fast exploration.
- Speech-to-text input and text-to-speech output (browser supported).
- Export active conversation as **TXT** or **PDF**.
- Fully responsive layout optimized for desktop and mobile.

## 🚀 Run Locally

Because this project uses browser APIs and fetch calls, run it through a local server:

```bash
python3 -m http.server 4173
```

Then open: `http://localhost:4173`

## 🧩 Tech Stack

- HTML5
- CSS3 (custom properties + responsive layout)
- Vanilla JavaScript (ES6+)
- Wikipedia REST + OpenSearch APIs

## 📁 Project Structure

- `index.html` — App layout and UI structure.
- `style.css` — Theme, responsive design, and component styles.
- `script.js` — State management, event handling, Wikipedia API integration, exports.

## 🔍 Notes

- Voice features depend on browser support (`SpeechRecognition` and `speechSynthesis`).
- Chat history is stored in browser `localStorage`. -->
# 🧠 PICTOPEDIA — Wikipedia Search Chatbot

PICTOPEDIA is a modern client-side conversational chatbot that retrieves information from Wikipedia and presents it in an interactive chat interface.

The application allows users to search topics, ask questions, and explore knowledge interactively using Wikipedia APIs. It supports multi-chat sessions, voice input, multilingual search, and conversation export.

This project demonstrates JavaScript frontend engineering, API integration, and conversational UI design using HTML, CSS, and Vanilla JavaScript.

--------------------------------------------------

# 🌐 Live Demo

https://word-search-chatbot-using-wikipedia.vercel.app/

--------------------------------------------------

# ✨ Features

### 💬 Conversational Chat Interface
Users can ask questions naturally (example: What is Artificial Intelligence) and receive Wikipedia-based responses.

### 📚 Wikipedia Knowledge Retrieval
The chatbot retrieves:
• Article summaries  
• Detailed extracts  
• Article links  
• Preview images  

using Wikipedia APIs.

### 🧠 Smart Conversational Responses
The chatbot handles simple conversations such as:
• Hello / Hi  
• How are you  
• Thanks  
• Goodbye  

These responses are generated locally without API calls.

### 🗂 Multi-Chat Sessions
Users can create and manage multiple chat sessions.

Each session supports:
• Rename chat  
• Pin / Unpin chat  
• Share chat  
• Delete chat  
• Chat history persistence  

All sessions are stored in browser localStorage.

### 🔍 Conversation Search
Users can search inside conversations to quickly find messages.

### 🎤 Voice Input
Speech-to-text input using Web Speech API.

Supported browsers:
• Chrome  
• Edge  
• Brave  

### 🔊 Text-to-Speech
Chatbot responses can be spoken using the Speech Synthesis API.

### 🌍 Multi-language Wikipedia Search
Users can switch language to search Wikipedia in different languages.

Examples:
• English  
• Hindi  
• Telugu  
• Spanish  
• French  

### 🖼 Image Support
If users ask for images, the chatbot includes Wikipedia preview images.

Example query:
show image of taj mahal

### 🔗 Article Links
Users can open the full Wikipedia article directly from chat.

### 💾 Export Chat
Users can export the active conversation as:

• TXT file  
• PDF (depending on version)

### 🎨 Modern UI
The interface includes:

• Glassmorphism UI  
• Dark / Light theme toggle  
• Responsive mobile layout  
• Sidebar chat history  

--------------------------------------------------

# 🛠 Tech Stack

HTML5 — Application structure  
CSS3 — UI styling and layout  
JavaScript (ES6+) — Application logic  
Wikipedia REST API — Article summaries  
Wikipedia OpenSearch API — Query resolution  
Web Speech API — Speech-to-text  
SpeechSynthesis API — Text-to-speech  
LocalStorage — Chat persistence  

--------------------------------------------------

# 📁 Project Structure

Word-Search-Chatbot-Using-Wikipedia

index.html  
style.css  
script.js  
README.md  

--------------------------------------------------

### index.html
Defines the chatbot layout including:

• Chat window  
• Input field  
• Sidebar  
• Chat history  
• Control buttons  

### style.css
Handles:

• UI styling  
• Light/Dark theme  
• Responsive layout  
• Chat bubble design  

### script.js
Contains the core logic:

• Chat session management  
• Message rendering  
• Wikipedia API integration  
• Voice input/output  
• Chat search  
• Export features  

--------------------------------------------------

# ⚙️ How It Works

### 1. Application Initialization

The application starts with the init() function.

This function:

• Loads saved theme  
• Loads language preference  
• Loads chat sessions  
• Creates session if none exists  
• Binds UI event listeners  
• Renders the interface  

--------------------------------------------------

### 2. Chat Sessions

Each session stores:

id  
title  
pinned  
createdAt  
messages

Messages contain:

id  
role  
text  
image  
link  
query  
time  

---

### 3. Sending a Message

When the user submits a question the following process occurs:

1 Capture user input  
2 Add user message to chat  
3 Fetch Wikipedia data  
4 Render bot response  

---

### 4. Wikipedia API Integration

Summary API

https://language.wikipedia.org/api/rest_v1/page/summary/query

Used to fetch:

• Article title  
• Summary  
• Image  
• Link  

OpenSearch API

https://language.wikipedia.org/w/api.php?action=opensearch

Used when the exact page title is not found.

Detailed Extract API

https://language.wikipedia.org/w/api.php?action=query&prop=extracts

Used to fetch additional article details.

---

### 5. Voice Input

Voice input uses SpeechRecognition.

Process:

1 User clicks microphone button  
2 Browser records voice  
3 Speech converted to text  
4 Query automatically sent  

---

### 6. Text-to-Speech

Bot responses can be spoken using speechSynthesis.

Example logic:

Create speech utterance from response text and send it to speechSynthesis engine for playback.



# 📌 Future Improvements

Possible enhancements:

• AI powered responses  
• Better conversation context  
• Image gallery support  
• Knowledge graph integration  
• Chat analytics dashboard  
• Improved multilingual support  

---
