const fetch = require('node-fetch');

async function listAll() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("No models returned. Response:", JSON.stringify(data));
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

listAll();
