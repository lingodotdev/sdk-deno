// Example: Using Lingo.dev SDK in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { LingoDotDevEngine, LocaleCode } from "../src/mod.ts";

// Initialize the engine with environment variables
const engine = new LingoDotDevEngine({
  apiKey: Deno.env.get("LINGO_API_KEY")!,
  batchSize: 25,
  idealBatchItemSize: 250,
});

interface TranslationRequest {
  text?: string;
  object?: Record<string, unknown>;
  chat?: Array<{ name: string; text: string }>;
  html?: string;
  sourceLocale: LocaleCode | null;
  targetLocale: LocaleCode;
  type: "text" | "object" | "chat" | "html" | "detect";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only handle POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const requestData: TranslationRequest = await req.json();
    const { type, sourceLocale, targetLocale } = requestData;

    let result: unknown;

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      switch (type) {
        case "text":
          if (!requestData.text) {
            throw new Error("Text is required for text translation");
          }
          result = await engine.localizeText(
            requestData.text,
            { sourceLocale, targetLocale },
            undefined,
            controller.signal,
          );
          break;

        case "object":
          if (!requestData.object) {
            throw new Error("Object is required for object translation");
          }
          result = await engine.localizeObject(
            requestData.object,
            { sourceLocale, targetLocale },
            undefined,
            controller.signal,
          );
          break;

        case "chat":
          if (!requestData.chat) {
            throw new Error("Chat is required for chat translation");
          }
          result = await engine.localizeChat(
            requestData.chat,
            { sourceLocale, targetLocale },
            undefined,
            controller.signal,
          );
          break;

        case "html":
          if (!requestData.html) {
            throw new Error("HTML is required for HTML translation");
          }
          result = await engine.localizeHtml(
            requestData.html,
            { sourceLocale, targetLocale },
            undefined,
            controller.signal,
          );
          break;

        case "detect":
          if (!requestData.text) {
            throw new Error("Text is required for language detection");
          }
          result = await engine.recognizeLocale(
            requestData.text,
            controller.signal,
          );
          break;

        default:
          throw new Error(`Unknown translation type: ${type}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Translation error:", error);

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error types
      if (error.name === "AbortError") {
        statusCode = 408; // Request timeout
        errorMessage = "Request timed out";
      } else if (error.message.includes("Server error")) {
        statusCode = 502; // Bad gateway
      } else if (error.message.includes("Invalid request")) {
        statusCode = 400; // Bad request
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});

// Example usage with curl:
/*
# Translate text
curl -X POST https://your-project.supabase.co/functions/v1/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "text",
    "text": "Hello, world!",
    "sourceLocale": "en",
    "targetLocale": "es"
  }'

# Translate object
curl -X POST https://your-project.supabase.co/functions/v1/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "object",
    "object": {
      "welcome": "Welcome to our app",
      "button": "Click here"
    },
    "sourceLocale": "en",
    "targetLocale": "fr"
  }'

# Translate chat
curl -X POST https://your-project.supabase.co/functions/v1/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "chat",
    "chat": [
      {"name": "Alice", "text": "Hello everyone!"},
      {"name": "Bob", "text": "How are you?"}
    ],
    "sourceLocale": "en",
    "targetLocale": "es"
  }'

# Translate HTML
curl -X POST https://your-project.supabase.co/functions/v1/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "html",
    "html": "<html><body><h1>Hello World</h1></body></html>",
    "sourceLocale": "en",
    "targetLocale": "de"
  }'

# Detect language
curl -X POST https://your-project.supabase.co/functions/v1/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "detect",
    "text": "Bonjour le monde"
  }'
*/
