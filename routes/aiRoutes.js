const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const requireAdminAuth = (req, res) => {
    if (req.user?.role === 'student') {
        res.status(403).json({ error: 'Admin authentication required' });
        return false;
    }
    return true;
};

router.post('/scan-logbook', auth, async (req, res) => {
    try {
        if (!requireAdminAuth(req, res)) return;
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const apiKeyString = process.env.GEMINI_API_KEY;
        if (!apiKeyString) {
            return res.status(500).json({ error: 'AI features are not configured on this server.' });
        }

        const apiKeys = apiKeyString.split(',').map(key => key.trim()).filter(key => key.length > 0);
        if (apiKeys.length === 0) {
            return res.status(500).json({ error: 'No valid AI API keys found.' });
        }

        // Extract actual MIME type from the base64 string
        const mimeTypeMatch = imageBase64.match(/^data:([^;]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");

        const prompt = "You are an attendance parser. Look at the attached image of a handwritten logbook. Extract all the numbers you see that look like roll numbers. Return ONLY a comma-separated list of those numbers (e.g., '1, 14, 23'). Do not include names, text, or any other explanations. If you see no numbers, return an empty string.";

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            },
        };

        let result = null;
        let lastError = null;

        for (const key of apiKeys) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                result = await model.generateContent([prompt, imagePart]);
                break; // Success, exit loop
            } catch (error) {
                console.warn('AI key failed, trying next one if available...', error.message);
                lastError = error;
            }
        }

        if (!result) {
            const errMsg = lastError?.message || "";
            if (errMsg.includes("429") || errMsg.includes("quota")) {
                throw new Error("Camera feature is disabled for today, please try again later.");
            }
            throw lastError || new Error("All provided Gemini API keys failed.");
        }
        const responseText = result.response.text();

        // Extract numbers explicitly to clean up any extra text
        const numbersMatch = responseText.match(/\d+/g);
        const rollNumbersString = numbersMatch ? numbersMatch.join(', ') : '';

        res.json({ rollNumbers: rollNumbersString });
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: 'Failed to process image', details: error.message || 'Unknown AI error occurred.' });
    }
});

module.exports = router;
