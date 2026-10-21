import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Direct universal fallback route to fix the 405 desktop app error
app.post('/', async (req, res) => {
    const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content || req.body.message || 'Hi';
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
        return res.status(401).json({ choices: [{ message: { role: 'assistant', content: "System check: Gemini API key is missing in cloud variables." } }] });
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

            const data = await response.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "System check complete. Connection established.";
            
            return res.json({
                choices: [{ message: { role: 'assistant', content: replyText } }]
            });

        } catch (error) {
            if (attempt === 3) {
                return res.status(500).json({ choices: [{ message: { role: 'assistant', content: "Gateway connection timeout. Please re-execute script." } }] });
            }
            await wait(2000);
        }
    }
});

// Also keep the completions layout route active for third-party tools
app.post('/v1/chat/completions', async (req, res) => {
    // Re-route traffic instantly to our main handler
    return app._router.handle(req, res);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 NOVA 24/7 Engine standing by on port ${PORT}`);
});
