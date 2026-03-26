const axios = require('axios');

// Helper function to call OpenRouter
const callOpenRouter = async (prompt, systemInstruction) => {
    return await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "openrouter/free", // Fast and cheap for text tasks
        messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
        ]
    }, {
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        }
    });
};

// Exporting individual API logics
exports.generateAboutUs = async (req, res) => {
    // Add "Do not ask follow-up questions" to the instruction
    const sys = `You are a professional copywriter. 
    Write a formal 'About Us' section based ONLY on the provided prompt. 
    Do not ask the user for more information. 
    Do not include conversational filler like 'Sure, I can help'. 
    If information is missing, use professional placeholders or general industry standard language.`;

    try {
        const result = await callOpenRouter(req.body.prompt, sys);
        res.json({ data: result.data.choices[0].message.content });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.generateProductDesc = async (req, res) => {
    const sys = "Write a detailed, high-converting product description.";
    try {
        const result = await callOpenRouter(req.body.prompt, sys);
        res.json({ data: result.data.choices[0].message.content });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.generateProductShortDesc = async (req, res) => {
    const sys = "Write a 2-sentence summary of the product.";
    try {
        const result = await callOpenRouter(req.body.prompt, sys);
        res.json({ data: result.data.choices[0].message.content });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.generateTechSpecs = async (req, res) => {
    const sys = "Provide technical specifications in a clean bulleted list.";
    try {
        const result = await callOpenRouter(req.body.prompt, sys);
        res.json({ data: result.data.choices[0].message.content });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.generateSEO = async (req, res) => {
    const sys = "Return SEO Meta Data as a JSON object: {title, description, keywords}.";
    try {
        const result = await callOpenRouter(req.body.prompt, sys);
        res.json({ data: result.data.choices[0].message.content });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.generateBlogIntro = async (req, res) => {
    const sys = "Write an engaging blog introduction hook.";
    try {
        const result = await callOpenRouter(req.body.prompt, sys);
        res.json({ data: result.data.choices[0].message.content });
    } catch (err) { res.status(500).json({ error: err.message }); }
};