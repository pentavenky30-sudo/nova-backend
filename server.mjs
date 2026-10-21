import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Secure endpoint that your Chrome frontend will talk to
app.post('/v1/chat/completions', async (req, res) => {
    const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content || 'Hi';
    // Dynamically pulls the API key you set up in your Render settings
    const apiKey = process.env.GEMINI_API_KEY || req.headers['authorization']?.replace('Bearer ', '') || '';

    if (!apiKey) {
        return res.status(401).json({ error: { message: "Missing Gemini API Key." } });
    }

    console.log(`[Cloud Request] Sending prompt to Gemini core...`);

    // Self-healing retry logic if Google hits a temporary rate limit
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch('https://googleapis.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userMessage }] }]
                })
            });

            if (response.status === 429) {
                console.warn(`[Quota Limit] Retrying in 5 seconds... (Attempt ${attempt}/3)`);
                await wait(5000);
                continue;
            }

            if (!response.ok) {
                const errorData = await response.text();
                return res.status(response.status).json({ error: { message: `Google Error: ${response.status}` } });
            }

            const data = await response.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
            
            // Returns standard format so the frontend reads it perfectly
            return res.json({
                choices: [{ message: { role: 'assistant', content: replyText } }]
            });

        } catch (error) {
            if (attempt === 3) {
                return res.status(500).json({ error: { message: "Failed to connect to Google API." } });
            }
            await wait(2000);
        }
    }
});

// Production port handling for Render environment
const PORT = process.env.PORT || 31415;
app.listen(PORT, () => {
    console.log(`🚀 NOVA 24/7 Backend initialized on port ${PORT}`);
});
