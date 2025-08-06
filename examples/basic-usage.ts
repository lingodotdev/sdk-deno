// Basic usage example for Lingo.dev Deno SDK
import { LingoDotDevEngine } from "../src/mod.ts";

// Initialize the engine with your API key
const engine = new LingoDotDevEngine({
  apiKey: Deno.env.get("LINGO_API_KEY") || "api_s6smmg5mufa3s9dk3dml3t3o", // Get from https://lingo.dev
  batchSize: 25,
  idealBatchItemSize: 250,
});

// Example 1: Translate a simple text
async function translateText() {
  try {
    const result = await engine.localizeText("Hello, world!", {
      sourceLocale: "en",
      targetLocale: "es",
    });
    console.log("Translated text:", result); // "¡Hola, mundo!"
  } catch (error) {
    console.error("Translation error:", error);
  }
}

// Example 2: Translate an object with nested strings
async function translateObject() {
  try {
    const uiStrings = {
      welcome: "Welcome to our app",
      buttons: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
      },
      messages: {
        success: "Operation completed successfully",
        error: "An error occurred",
      },
    };

    const translated = await engine.localizeObject(uiStrings, {
      sourceLocale: "en",
      targetLocale: "fr",
    });

    console.log("Translated object:", translated);
  } catch (error) {
    console.error("Translation error:", error);
  }
}

// Example 3: Translate to multiple languages
async function batchTranslate() {
  try {
    const results = await engine.batchLocalizeText("Welcome to our service", {
      sourceLocale: "en",
      targetLocales: ["es", "fr", "de", "it"],
    });

    console.log("Batch translations:", results);
  } catch (error) {
    console.error("Batch translation error:", error);
  }
}

// Example 4: Translate a chat conversation
async function translateChat() {
  try {
    const chat = [
      { name: "Alice", text: "Hello everyone!" },
      { name: "Bob", text: "How are you doing today?" },
      { name: "Charlie", text: "I'm doing great, thanks!" },
    ];

    const translatedChat = await engine.localizeChat(chat, {
      sourceLocale: "en",
      targetLocale: "es",
    });

    console.log("Translated chat:", translatedChat);
  } catch (error) {
    console.error("Chat translation error:", error);
  }
}

// Example 5: Translate an array of strings
async function translateStringArray() {
  try {
    const fruits = ["apple", "banana", "orange", "grape", "strawberry"];

    const translatedFruits = await engine.localizeStringArray(fruits, {
      sourceLocale: "en",
      targetLocale: "ja",
    });

    console.log("Translated fruits:", translatedFruits);
  } catch (error) {
    console.error("Array translation error:", error);
  }
}

// Example 6: Detect language
async function detectLanguage() {
  try {
    const locale = await engine.recognizeLocale("Bonjour le monde");
    console.log("Detected language:", locale); // "fr"
  } catch (error) {
    console.error("Language detection error:", error);
  }
}

// Example 7: Using progress callback
async function translateWithProgress() {
  try {
    const largeText =
      "This is a large text that we want to translate with progress tracking.";

    const result = await engine.localizeText(largeText, {
      sourceLocale: "en",
      targetLocale: "de",
    }, (progress) => {
      console.log(`Translation progress: ${progress}%`);
    });

    console.log("Final result:", result);
  } catch (error) {
    console.error("Translation with progress error:", error);
  }
}

// Example 8: Using AbortController for cancellation
async function translateWithCancellation() {
  try {
    const controller = new AbortController();

    // Cancel the request after 5 seconds
    setTimeout(() => {
      controller.abort();
      console.log("Translation cancelled");
    }, 5000);

    const result = await engine.localizeText(
      "This is a test message",
      {
        sourceLocale: "en",
        targetLocale: "zh",
      },
      undefined,
      controller.signal,
    );

    console.log("Translation result:", result);
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("Translation was cancelled");
    } else {
      console.error("Translation error:", error);
    }
  }
}

// Example 9: Get user information
async function getUserInfo() {
  try {
    const userInfo = await engine.whoami();
    if (userInfo) {
      console.log("User info:", userInfo);
    } else {
      console.log("Not authenticated or invalid API key");
    }
  } catch (error) {
    console.error("User info error:", error);
  }
}

// Run examples
if (import.meta.main) {
  console.log("Running Lingo.dev SDK examples...\n");

  await translateText();
  await translateObject();
  await batchTranslate();
  await translateChat();
  await translateStringArray();
  await detectLanguage();
  await translateWithProgress();
  await translateWithCancellation();
  await getUserInfo();

  console.log("\nAll examples completed!");
}
