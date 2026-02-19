const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  let query = "";

  // Get query from POST body
  if (event.httpMethod === "POST" && event.body) {
    try {
      const body = JSON.parse(event.body);
      query = body.query || "";
    } catch (err) {
      console.error("Error parsing POST body:", err);
      query = "";
    }
  }

  // Get query from URL parameters
  if (!query && event.queryStringParameters) {
    query =
      event.queryStringParameters.q ||
      event.queryStringParameters.query ||
      "";
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return {
      statusCode: 500,
      body: "Server configuration error: Gemini API key is missing.",
    };
  }

  if (!query || query.trim() === "") {
    return {
      statusCode: 200,
      body: "Pocopie AI is operational. Please provide a query!",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const systemInstruction = `
You are a helpful and friendly assistant for the Free Fire streamer 'pocopie'.

Rules:
1. Do NOT mention any username.
2. Do NOT mention any channel ID.
3. Do NOT address the user personally.
4. If asked 'who is pocopie?', say they are the owner and streamer.
5. If asked 'who are you?', say you are Pocopie's assistant.
6. If asked about '!gamble', explain it is a Streamlabs command with random chances.
7. For all other questions, provide a helpful and correct answer.
8. STRICTLY keep your total response under 50 words.
`;

    const fullPrompt = `${systemInstruction}

User Question: ${query.trim()}

Answer:`;

    const generationConfig = {
      maxOutputTokens: 150,
      temperature: 0.7,
      topP: 0.9,
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: generationConfig,
    });

    const response = await result.response;
    let geminiResponse =
      response.text() || "Sorry, I could not generate a response.";

    // 🔒 Extra safety cleanup (remove accidental usernames or channel IDs)
    geminiResponse = geminiResponse.replace(/@[\w-]+/g, "");
    geminiResponse = geminiResponse.replace(/UC[a-zA-Z0-9_-]{22}/g, "");

    // Nightbot safe limit
    const NIGHTBOT_CHAR_LIMIT = 400;
    if (geminiResponse.length > NIGHTBOT_CHAR_LIMIT) {
      geminiResponse =
        geminiResponse.substring(0, NIGHTBOT_CHAR_LIMIT - 3) + "...";
    }

    const nightbotResponseUrl =
      event.headers &&
      (event.headers["nightbot-response-url"] ||
        event.headers["Nightbot-Response-Url"]);

    // If request came from Nightbot
    if (nightbotResponseUrl) {
      try {
        await fetch(nightbotResponseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: geminiResponse }),
        });

        return { statusCode: 200, body: "Response sent to chat" };
      } catch (postErr) {
        console.error("Error sending to Nightbot:", postErr);
        return { statusCode: 200, body: geminiResponse };
      }
    }

    // Normal API response
    return { statusCode: 200, body: geminiResponse };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: `Error: ${error.message}`,
    };
  }
};
