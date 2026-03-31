const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory rate limit store for free usage
// Should be cleared/reset daily or realistically stored in DB
const usageDB = new Map();
const FREE_LIMIT = 5;

// Helper to get today's date string
const getTodayDateStr = () => {
    return new Date().toISOString().split('T')[0];
};

// Route: Health Check / Landing Page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <title>AI Assistant API</title>
            <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #0f172a; color: #fff; margin: 0;">
                <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 3rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <h1 style="margin-top: 0;">✨ AI Freelance API is Online</h1>
                    <p style="color: #94a3b8; max-width: 400px; line-height: 1.6;">This is the secure backend server operating the AI Freelance Assistant Chrome Extension.</p>
                    <p style="color: #38bdf8; font-family: monospace; padding: 10px; background: rgba(56, 189, 248, 0.1); border-radius: 8px; margin-bottom: 0;">Status: 200 OK | Node.js Proxy</p>
                </div>
            </body>
        </html>
    `);
});

// Route: Get Usage
app.get('/api/usage', (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const today = getTodayDateStr();

    if (!usageDB.has(ip)) {
        res.json({ used: 0, limit: FREE_LIMIT });
        return;
    }

    const userData = usageDB.get(ip);
    if (userData.date !== today) {
        // Reset if it's a new day
        userData.date = today;
        userData.count = 0;
    }

    res.json({ used: userData.count, limit: FREE_LIMIT });
});

// Route: Generate Proposal
app.post('/api/generate', async (req, res) => {
    try {
        const ip = req.ip || req.connection.remoteAddress;
        const today = getTodayDateStr();

        // 1. Check Rate Limit
        if (!usageDB.has(ip)) {
            usageDB.set(ip, { count: 0, date: today });
        }
        
        const userData = usageDB.get(ip);
        
        // Reset if it's a new day
        if (userData.date !== today) {
            userData.date = today;
            userData.count = 0;
        }

        if (userData.count >= FREE_LIMIT) {
            return res.status(429).json({ 
                error: "Free usage limit reached. Please use your own API key in the extension settings." 
            });
        }

        // 2. Prepare payload from request
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Missing prompt data" });
        }

        // 3. Call App's AI Model via REST identical to frontend
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Server missing API key configuration." });
        }

        // We use the exact same request format you structured in your Chrome extension
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{text: "You are an expert proposal writing assistant. Output ONLY perfectly valid JSON. Escape all newlines as \\n within strings."}]
                },
                contents: [{
                    parts: [{text: prompt}]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        // IMPORTANT: Increment usage ONLY after successful generation!
        userData.count += 1;
        
        res.json({
            success: true,
            data: data, // Return the raw gemini data to the frontend to parse naturally
            usage: {
                used: userData.count,
                limit: FREE_LIMIT
            }
        });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`AI Freelance Assistant Backend running on http://localhost:${PORT}`);
    console.log(`Free Limit set to: ${FREE_LIMIT} per day per IP`);
});
