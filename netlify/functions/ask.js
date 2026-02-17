const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = require("node-fetch"); // Still good to include for broader compatibility

exports.handler = async (event, context) => {
  let query = "";

  // Parse from POST (JSON body)
  if (event.httpMethod === "POST" && event.body) {
    try {
      const body = JSON.parse(event.body);
      query = body.query || "";
    } catch (err) {
      console.error("Error parsing POST body:", err);
      query = "";
    }
  }

  // Parse from GET (query parameters)
  if (!query && event.queryStringParameters) {
    query =
      event.queryStringParameters.q || event.queryStringParameters.query || "";
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error("GEMINI_API_KEY environment variable is not set.");
    return {
      statusCode: 500,
      body: "Server configuration error: Gemini API key is missing.",
    };
  }

  if (!query || query.trim() === "") {
    return {
      statusCode: 200,
      body: "Gemini Chatbot Function is operational. Please provide a query!",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Extract user info from Nightbot headers
    const nightbotUserHeader =
      event.headers &&
      (event.headers["nightbot-user"] || event.headers["Nightbot-User"]);

    let username = "Friend";
    if (nightbotUserHeader) {
      try {
        // nightbot-user header format: name=display_name&provider=...
        const params = new URLSearchParams(nightbotUserHeader);
        username = params.get("name") || "Friend";
      } catch (e) {
        console.error("Error parsing nightbot-user header:", e);
      }
    }

    // Construct the system instruction
    const systemInstruction = `
      You are a helpful and very friendly assistant for the Free Fire streamer 'pocopie'.

      Your goal: Answer the user's question accurately while being friendly.

      Specific Rules:
      1. Use the name "${username}" to address the user.
      2. If asked 'who is pocopie?', say they are the owner and streamer.
      3. If asked 'who are you?', say you are Pocopie assistant.
      4. If asked about '!gamble', explain it is a Streamlabs command with random chances.
      5. For all other questions, provide a helpful and correct answer.
      6. ALWAYS keep your total response under 55 words.
    `;

    const fullPrompt = `${systemInstruction}\n\nUser Question: ${query.trim()}\n\nFriendly Answer:`;

    const generationConfig = {
      maxOutputTokens: 500,
      temperature: 0.7,
      topP: 0.9,
    };

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }], // Use structured content for clarity
        generationConfig: generationConfig
    });
    const response = await result.response;
    let geminiResponse =
      response.text() || "Sorry, I could not generate a response.";

    const NIGHTBOT_CHAR_LIMIT = 450; // Increased to ensure 65 words fit without truncation
    if (geminiResponse.length > NIGHTBOT_CHAR_LIMIT) {
      geminiResponse = geminiResponse.substring(0, NIGHTBOT_CHAR_LIMIT - 3) + "...";
    }

    const nightbotResponseUrl =
      event.headers &&
      (event.headers["nightbot-response-url"] ||
        event.headers["Nightbot-Response-Url"]);
    if (nightbotResponseUrl) {
      try {
        await fetch(nightbotResponseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: geminiResponse }),
        });
        return { statusCode: 200, body: "Response sent to chat" };
      } catch (postErr) {
        console.error("Error sending response to Nightbot-Response-Url:", postErr);
        return { statusCode: 200, body: geminiResponse };
      }
    }

    return { statusCode: 200, body: geminiResponse };
  } catch (error) {
    console.error("Error:", error);

    return {
      statusCode: 500, // Or whatever the error status is
      body: `Error from Gemini API: ${error.message}${error.stack ? ' | ' + error.stack.split('\n')[0] : ''}`,
    };
  }
};
