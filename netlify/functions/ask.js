const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Get headers from Nightbot
    const headers = event.headers;
    const nightbotUser = headers["nightbot-user"];
    const nightbotChannel = headers["nightbot-channel"];
    const nightbotResponseUrl = headers["nightbot-response-url"];

    // Parse query from request body or URL parameters
    let query = "";

    if (event.body) {
      const body = JSON.parse(event.body);
      query = body.query || "";
    }

    if (!query && event.queryStringParameters) {
      query =
        event.queryStringParameters.q ||
        event.queryStringParameters.query ||
        "";
    }

    if (!query || query.trim() === "") {
      return {
        statusCode: 200,
        body: "Please provide a question to ask Gemini!",
      };
    }

    // Initialize Gemini AI client
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Generate response from Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query.trim(),
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // Disable thinking for faster responses
        },
      },
    });

    let geminiResponse =
      response.text || "Sorry, I could not generate a response.";

    // Limit response length to fit Nightbot's limits (400 characters for regular response)
    if (geminiResponse.length > 350) {
      geminiResponse = geminiResponse.substring(0, 347) + "...";
    }

    // If we have a response URL from Nightbot, post the response back
    if (nightbotResponseUrl) {
      // Use the response URL to send the message back to chat
      const fetch = require("node-fetch");

      try {
        await fetch(nightbotResponseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: geminiResponse,
          }),
        });

        return {
          statusCode: 200,
          body: "Response sent to chat",
        };
      } catch (postError) {
        console.error("Error posting to Nightbot response URL:", postError);
        // Fall back to returning the response directly
        return {
          statusCode: 200,
          body: geminiResponse,
        };
      }
    } else {
      // Return response directly (for testing or if no response URL provided)
      return {
        statusCode: 200,
        body: geminiResponse,
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: "Sorry, there was an error processing your request.",
    };
  }
};
