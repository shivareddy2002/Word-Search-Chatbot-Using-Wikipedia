# PICTOPEDIA — Wikipedia Search Chatbot

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
- Chat history is stored in browser `localStorage`.
