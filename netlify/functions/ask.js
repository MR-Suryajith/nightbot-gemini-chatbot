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

    // --- **IMPORTANT CHANGES HERE FOR CONCISE PROMPT** ---

    // Prepend the instruction to the user's query
    const PROMPT_INSTRUCTION = "Answer this question extremely concisely, in 50 words or less, directly to the user, as a friendly chatbot: ";
    const fullPrompt = PROMPT_INSTRUCTION + query.trim();

    const generationConfig = {
      maxOutputTokens: 60, // Slightly more tokens than 50 words for safety, as words != tokens.
                           // 50 words is roughly 70-80 tokens, but we also have an instruction.
                           // Let's aim for a token limit slightly above the word count instruction.
      temperature: 0.5,    // Lower temperature for more focused, less verbose output.
      topP: 0.7,           // Can further reduce verbosity.
      topK: 30,            // Can further reduce verbosity.
    };

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }], // Use structured content for clarity
        generationConfig: generationConfig
    });
    const response = await result.response;
    let geminiResponse =
      response.text() || "Sorry, I could not generate a response.";

    const NIGHTBOT_CHAR_LIMIT = 350; // Still a good safety measure
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
      statusCode: 500,
      body: "Sorry, there was an error processing your request.",
    };
  }
};
