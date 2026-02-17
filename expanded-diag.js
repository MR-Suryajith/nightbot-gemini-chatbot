const { GoogleGenerativeAI } = require("@google/generative-ai");

async function diag() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = [
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-8b-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.0-pro"
    ];

    for (const m of models) {
        process.stdout.write(`Testing ${m}... `);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("Hi");
            console.log("SUCCESS!");
        } catch (e) {
            console.log(`FAILED: ${e.message.split('\n')[0].substring(0, 100)}`);
        }
    }
}
diag();
