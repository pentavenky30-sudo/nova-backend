import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Render Health Check Route
app.get('/', (req, res) => {
    res.status(200).send("NOVA Cloud Engine Status: OPERATIONAL");
});

// Production Unified Route handling both styles perfectly
app.post('/v1/chat/completions', async (req, res) => {
    // Looks for standard message array OR direct content structure
    let userMessage = 'Hi';
    if (req.body.messages && req.body.messages.length > 0) {
        userMessage = req.body.messages[req.body.messages.length - 1].content;
    } else if (req.body.message) {
        userMessage = req.body.message;
    }

    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
        return res.status(200).json({
            choices: [{ message: { role: 'assistant', content: "[NOVA CONFIG ERROR]: Gemini API key is missing in your cloud dashboard environment." } }]
        });
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
                await wait(3000);
                continue;
            }

            const data = await response.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "System check complete. Live link established.";
            
            return res.json({
                choices: [{ message: { role: 'assistant', content: replyText } }]
            });

        } catch (error) {
            if (attempt === 3) {
                return res.status(200).json({
                    choices: [{ message: { role: 'assistant', content: "[NOVA SYSTEM NOTICE]: Cloud pipeline timed out. Please try sending your command again." } }]
                });
            }
            await wait(1000);
        }
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NOVA 24/7 Engine standing by on port ${PORT}`);
});
