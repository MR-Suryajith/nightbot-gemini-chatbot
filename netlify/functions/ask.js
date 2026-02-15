const { GoogleGenAI } = require("@google/genai");
const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  let query = "";

  // Parse from POST (JSON body)
  if (event.httpMethod === "POST" && event.body) {
    try {
      const body = JSON.parse(event.body);
      query = body.query || "";
    } catch (err) {
      // Fallback if body can't be parsed
      query = "";
    }
  }

  // Parse from GET (query parameters)
  if (!query && event.queryStringParameters) {
    query =
      event.queryStringParameters.q || event.queryStringParameters.query || "";
  }

  if (!query || query.trim() === "") {
    return {
      statusCode: 200,
      body: "Please provide a question to ask Gemini!",
    };
  }

  try {
    // Initialize Gemini AI client
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Generate response from Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: query.trim(),
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    let geminiResponse =
      response.text || "Sorry, I could not generate a response.";

    // Nightbot 400-char limit safety margin
    if (geminiResponse.length > 350) {
      geminiResponse = geminiResponse.substring(0, 347) + "...";
    }

    // Send to nightbot-response URL if available (from headers)
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
        // fallback
        return { statusCode: 200, body: geminiResponse };
      }
    }

    // Standard return: text only
    return { statusCode: 200, body: geminiResponse };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: "Sorry, there was an error processing your request.",
    };
  }
};
