const { GoogleGenerativeAI } = require("@google/generative-ai");

async function diagnostic() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-8b-latest"
    ];

    for (const modelName of models) {
        console.log(`\n--- Testing Model: ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            const response = await result.response;
            console.log(`SUCCESS: ${modelName} is working!`);
            console.log(`Response: ${response.text().substring(0, 50)}...`);
            return modelName; // Stop at first success
        } catch (e) {
            console.log(`ERROR for ${modelName}:`, e.message);
        }
    }
    console.log("\nNo models were successful.");
}

diagnostic();
