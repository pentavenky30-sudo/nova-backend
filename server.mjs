import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Render Health Check Route - This stops the "Timed Out" error
app.get('/', (req, res) => {
    res.status(200).send("NOVA Cloud Engine Status: OPERATIONAL");
});

// Main Chat Processing Engine
app.post('/v1/chat/completions', async (req, res) => {
    const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content || 'Hi';
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
        return res.status(401).json({ error: { message: "GEMINI_API_KEY is missing in Render settings." } });
    }

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
                await wait(4000);
                continue;
            }

            if (!response.ok) {
                const errText = await response.text();
                return res.status(response.status).json({ error: { message: `Google API Error: ${response.status}` } });
            }

            const data = await response.json();
            const replyText = data.candidates?.?.content?.parts?.?.text || "System check complete.";
            
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NOVA 24/7 Engine standing by on port ${PORT}`);
});
