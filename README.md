# 🚀 AI Freelance Assistant Extension

**A powerful, context-aware Chrome Extension backed by an Express.js API that generates highly-personalized freelance job proposals using Google Gemini AI.**

Designed to streamline the freelance bidding process on platforms like Upwork, Fiverr, and LinkedIn by instantly scanning job descriptions and writing professional, engaging proposals optimized for conversion.

---

## ✨ Features
- **Extracted Context Analysis**: Automatically parses active job web pages to extract requirements, job titles, and company roles silently.
- **Node.js Gateway Backend**: Includes an independent Express server that acts as a middleman for API interactions, featuring a built-in day-by-day IP Rate Limiter to protect the API key while giving anonymous free users a quota limit.
- **Dual API Modes**: Users can frictionlessly fall back to their own API keys manually via strict local Chrome storage usage, ensuring 0% backend-dependency downtimes.
- **Intelligent Tone Controls**: Generates dynamically adapting copy matching user-selected professional tones, incorporating unique profile credentials immediately.
- **Impenetrable Sanitization Engine**: Custom JSON data extraction pipelines prevent structural syntax crashes regardless of LLM markdown formatting limits.

---

## 🛠️ Tech Stack
**Frontend:** HTML5, Modern CSS (Glassmorphism UI), Vanilla JavaScript, Chrome Extension APIs v3
**Backend:** Node.js, Express, Cross-Origin Resource Sharing (CORS)
**AI Engine:** Google Generative Language Model (\`gemini-2.5-flash\`) Architecture

---

## 🚀 Installation & Setup

### 1. Backend Server
The server manages API connections securely while handling free quotas.
1. Navigate into the \`backend\` directory: \`cd backend\`
2. Install dependencies: \`npm install\`
3. Create a \`.env\` file in the \`backend\` folder with your API key:
   \`\`\`env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   \`\`\`
4. Run the server: \`node server.js\`

### 2. Chrome Extension UI
1. Open Google Chrome and navigate to \`chrome://extensions/\`
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the root directory containing the \`manifest.json\` file.
4. Pin the extension to your browser and click its icon to begin!

---

*This project was developed strictly as a modern technical demonstration of blending isolated sandboxed Chrome APIs with a scalable REST Node server logic utilizing leading LLM prompt engineering.*
