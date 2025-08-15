import { assertEquals, assertRejects } from "@std/assert";
import { LingoDotDevEngine, ReplexicaEngine } from "../src/mod.ts";

// Mock fetch for testing
let mockFetch: typeof fetch;
let originalFetch: typeof fetch;

function setupMockFetch(mockResponse: Record<string, unknown>) {
  originalFetch = globalThis.fetch;
  mockFetch = (_input: string | URL | Request, _init?: RequestInit) => {
    return Promise.resolve(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  globalThis.fetch = mockFetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("LingoDotDevEngine - basic instantiation", () => {
  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  assertEquals(typeof engine, "object");
});

Deno.test("LingoDotDevEngine - should require apiKey", () => {
  try {
    new LingoDotDevEngine({});
  } catch (error) {
    assertEquals((error as Error).message, "apiKey is required");
  }
});

Deno.test("LingoDotDevEngine - localizeText", async () => {
  setupMockFetch({ data: { text: "Hola mundo" } });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const result = await engine.localizeText("Hello world", {
    sourceLocale: "en",
    targetLocale: "es",
  });

  assertEquals(result, "Hola mundo");
  restoreFetch();
});

Deno.test("LingoDotDevEngine - localizeText with AbortController", async () => {
  setupMockFetch({ data: { text: "Hola mundo" } });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const controller = new AbortController();

  // Test that the signal is passed correctly
  const promise = engine.localizeText(
    "Hello world",
    {
      sourceLocale: "en",
      targetLocale: "es",
    },
    undefined,
    controller.signal,
  );

  const result = await promise;
  assertEquals(result, "Hola mundo");
  restoreFetch();
});

Deno.test("LingoDotDevEngine - localizeText with abort signal", async () => {
  // Setup a mock that respects the abort signal
  originalFetch = globalThis.fetch;
  globalThis.fetch = (_input: string | URL | Request, init?: RequestInit) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        resolve(
          new Response(JSON.stringify({ data: { text: "Delayed response" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }, 100);

      // Check if signal is already aborted
      if (init?.signal?.aborted) {
        clearTimeout(timeoutId);
        reject(new DOMException("The operation was aborted", "AbortError"));
        return;
      }

      // Listen for abort signal
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        reject(new DOMException("The operation was aborted", "AbortError"));
      });
    });
  };

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const controller = new AbortController();

  // Abort immediately
  controller.abort();

  await assertRejects(
    () =>
      engine.localizeText(
        "Hello world",
        {
          sourceLocale: "en",
          targetLocale: "es",
        },
        undefined,
        controller.signal,
      ),
    DOMException,
    "The operation was aborted",
  );

  restoreFetch();
});

Deno.test("LingoDotDevEngine - batchLocalizeText", async () => {
  setupMockFetch({ data: { text: "Texto localizado" } });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const results = await engine.batchLocalizeText("Hello", {
    sourceLocale: "en",
    targetLocales: ["es", "fr"],
  });

  assertEquals(results.length, 2);
  assertEquals(results[0], "Texto localizado");
  assertEquals(results[1], "Texto localizado");
  restoreFetch();
});

Deno.test("LingoDotDevEngine - localizeStringArray", async () => {
  let callCount = 0;
  originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    const responses = [
      {
        data: {
          item_0: "ES:Hello",
          item_1: "ES:Goodbye",
          item_2: "ES:How are you?",
        },
      },
    ];
    return Promise.resolve(
      new Response(JSON.stringify(responses[callCount++]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const inputArray = ["Hello", "Goodbye", "How are you?"];

  const result = await engine.localizeStringArray(inputArray, {
    sourceLocale: "en",
    targetLocale: "es",
  });

  assertEquals(result, ["ES:Hello", "ES:Goodbye", "ES:How are you?"]);
  assertEquals(result.length, 3);
  restoreFetch();
});

Deno.test("LingoDotDevEngine - localizeStringArray empty array", async () => {
  setupMockFetch({ data: {} });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const result = await engine.localizeStringArray([], {
    sourceLocale: "en",
    targetLocale: "es",
  });

  assertEquals(result, []);
  restoreFetch();
});

Deno.test("LingoDotDevEngine - localizeChat", async () => {
  setupMockFetch({
    data: {
      chat_0: "ES:Hello everyone",
      chat_1: "ES:How are you doing?",
      chat_2: "ES:Great to see you",
    },
  });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const chat = [
    { name: "Alice", text: "Hello everyone" },
    { name: "Bob", text: "How are you doing?" },
    { name: "Charlie", text: "Great to see you" },
  ];

  const result = await engine.localizeChat(chat, {
    sourceLocale: "en",
    targetLocale: "es",
  });

  assertEquals(result.length, 3);
  assertEquals(result[0].name, "Alice");
  assertEquals(result[0].text, "ES:Hello everyone");
  assertEquals(result[1].name, "Bob");
  assertEquals(result[1].text, "ES:How are you doing?");
  assertEquals(result[2].name, "Charlie");
  assertEquals(result[2].text, "ES:Great to see you");
  restoreFetch();
});

Deno.test("LingoDotDevEngine - localizeHtml", async () => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    // Mock translation by adding 'ES:' prefix to all strings
    const mockResponse = {
      data: {
        "text_0": "ES:Test Page",
        "text_1": "ES:standalone text",
        "text_2": "ES:Hello World",
        "text_3": "ES:This is a paragraph with",
        "text_4": "ES:a link",
        "text_5": "ES:and an",
        "text_6": "ES:and some",
        "text_7": "ES:bold",
        "text_8": "ES:and italic",
        "text_9": "ES:text.",
        "attr_0_10": "ES:Link title",
        "attr_1_11": "ES:Test image",
        "attr_2_12": "ES:Enter text",
        "attr_3_13": "ES:Page description",
      },
    };
    return Promise.resolve(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const inputHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Page</title>
    <meta name="description" content="Page description">
  </head>
  <body>
    standalone text
    <div>
      <h1>Hello World</h1>
      <p>
        This is a paragraph with
        <a href="/test" title="Link title">a link</a>
        and an
        <img src="/test.jpg" alt="Test image">
        and some <b>bold <i>and italic</i></b> text.
      </p>
      <script>
        const doNotTranslate = "this text should be ignored";
      </script>
      <input type="text" placeholder="Enter text">
    </div>
  </body>
</html>`.trim();

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const result = await engine.localizeHtml(inputHtml, {
    sourceLocale: "en",
    targetLocale: "es",
  });

  // Verify the final HTML structure contains translations
  assertEquals(result.includes('lang="es"'), true);
  assertEquals(result.includes("ES:Test Page"), true);
  assertEquals(result.includes("ES:Hello World"), true);
  assertEquals(
    result.includes('const doNotTranslate = "this text should be ignored"'),
    true,
  );
  restoreFetch();
});

Deno.test("LingoDotDevEngine - recognizeLocale", async () => {
  setupMockFetch({ locale: "es" });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const result = await engine.recognizeLocale("Hola mundo");

  assertEquals(result, "es");
  restoreFetch();
});

Deno.test("LingoDotDevEngine - whoami", async () => {
  setupMockFetch({ email: "test@example.com", id: "user123" });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  const result = await engine.whoami();

  assertEquals(result?.email, "test@example.com");
  assertEquals(result?.id, "user123");
  restoreFetch();
});

Deno.test("LingoDotDevEngine - error handling", async () => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(new Response("Server Error", { status: 500 }));
  };

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });

  await assertRejects(
    () =>
      engine.localizeText("Hello", {
        sourceLocale: "en",
        targetLocale: "es",
      }),
    Error,
    "Server error",
  );

  restoreFetch();
});

Deno.test("LingoDotDevEngine - progress callback", async () => {
  setupMockFetch({ data: { text: "Texto traducido" } });

  const engine = new LingoDotDevEngine({ apiKey: "test-key" });
  let progressCallbackCalled = false;

  await engine.localizeText("Hello world", {
    sourceLocale: "en",
    targetLocale: "es",
  }, (progress) => {
    progressCallbackCalled = true;
    assertEquals(typeof progress, "number");
  });

  assertEquals(progressCallbackCalled, true);
  restoreFetch();
});

// Test deprecated classes
Deno.test("ReplexicaEngine - deprecated class warning", () => {
  console.log("Testing deprecated ReplexicaEngine class...");
  // Capture console.warn calls
  const originalWarn = console.warn;
  let warnCalled = false;
  console.warn = (...args: string[]) => {
    warnCalled = true;
    assertEquals(args[0].includes("ReplexicaEngine is deprecated"), true);
  };

  const engine = new ReplexicaEngine({ apiKey: "test" });
  assertEquals(typeof engine, "object");
  assertEquals(warnCalled, true);

  console.warn = originalWarn;
});
