# Lingo.dev Deno SDK

A powerful, dependency-free Deno SDK for the Lingo.dev localization platform. Optimized for Edge Runtime environments and Supabase Functions.

## Features

- 🌐 **Complete localization support**: Text, objects, chat sequences, HTML documents
- 🚀 **Edge Runtime optimized**: Works perfectly in Supabase Edge Functions, Deno Deploy, and Cloudflare Workers
- � **Zero dependencies**: No external dependencies, uses only Deno's built-in APIs
- 🎯 **TypeScript first**: Full TypeScript support with comprehensive type definitions
- ⚡ **Fast and efficient**: Intelligent batching and chunking for optimal performance
- 🛑 **Cancellation support**: AbortController support for request cancellation
- 📊 **Progress tracking**: Real-time progress callbacks for long-running translations
- 🔄 **Multiple formats**: Support for text, objects, arrays, chat, and HTML
- 🌍 **Language detection**: Automatic language detection capabilities
- 🎨 **HTML preservation**: Translate HTML while preserving structure and formatting

## Installation

### From JSR (Recommended)

```typescript
import { LingoDotDevEngine } from "jsr:@lingo.dev/sdk-deno";
```

### From GitHub

```typescript
import { LingoDotDevEngine } from "https://deno.land/x/lingo_sdk/mod.ts";
```

### Direct import

```typescript
import { LingoDotDevEngine } from "https://raw.githubusercontent.com/lingodotdev/sdk-deno/main/mod.ts";
```

## Quick Start

```typescript
import { LingoDotDevEngine } from "jsr:@lingo.dev/sdk-deno";

// Initialize the engine
const engine = new LingoDotDevEngine({
  apiKey: "your-api-key-here", // Get from https://lingo.dev
});

// Translate text
const result = await engine.localizeText("Hello, world!", {
  sourceLocale: "en",
  targetLocale: "es",
});

console.log(result); // "¡Hola, mundo!"
```

## Usage Examples

### Text Translation

```typescript
const translation = await engine.localizeText("Welcome to our app", {
  sourceLocale: "en",
  targetLocale: "fr",
});
// Result: "Bienvenue dans notre application"
```

### Object Translation

```typescript
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
  targetLocale: "es",
});
```

### Batch Translation

```typescript
const results = await engine.batchLocalizeText("Hello", {
  sourceLocale: "en",
  targetLocales: ["es", "fr", "de", "it"],
});
// Results: ["Hola", "Bonjour", "Hallo", "Ciao"]
```

### Chat Translation

```typescript
const chat = [
  { name: "Alice", text: "Hello everyone!" },
  { name: "Bob", text: "How are you doing?" },
  { name: "Charlie", text: "Great to see you!" },
];

const translatedChat = await engine.localizeChat(chat, {
  sourceLocale: "en",
  targetLocale: "es",
});
// Preserves speaker names while translating text
```

### HTML Translation

```typescript
const html = `
<html>
  <head>
    <title>My Website</title>
    <meta name="description" content="Welcome to my site">
  </head>
  <body>
    <h1>Hello World</h1>
    <p>This is a <a href="#" title="Link title">link</a></p>
    <img src="image.jpg" alt="Image description">
  </body>
</html>
`;

const translatedHtml = await engine.localizeHtml(html, {
  sourceLocale: "en",
  targetLocale: "es",
});
// Translates text content and localizable attributes while preserving HTML structure
```

### String Array Translation

```typescript
const fruits = ["apple", "banana", "orange", "grape"];
const translatedFruits = await engine.localizeStringArray(fruits, {
  sourceLocale: "en",
  targetLocale: "ja",
});
// Result: ["りんご", "バナナ", "オレンジ", "ぶどう"]
```

### Language Detection

```typescript
const locale = await engine.recognizeLocale("Bonjour le monde");
console.log(locale); // "fr"
```

### Progress Tracking

```typescript
const result = await engine.localizeText("Large text content...", {
  sourceLocale: "en",
  targetLocale: "de",
}, (progress) => {
  console.log(`Translation progress: ${progress}%`);
});
```

### Request Cancellation

```typescript
const controller = new AbortController();

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10000);

try {
  const result = await engine.localizeText(
    "Some text",
    {
      sourceLocale: "en",
      targetLocale: "zh",
    },
    undefined,
    controller.signal,
  );
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Translation was cancelled");
  }
}
```

## Supabase Edge Functions

Perfect for Supabase Edge Functions:

```typescript
// supabase/functions/translate/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { LingoDotDevEngine } from "jsr:@lingo.dev/sdk-deno";

const engine = new LingoDotDevEngine({
  apiKey: Deno.env.get("LINGO_API_KEY")!,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { text, sourceLocale, targetLocale } = await req.json();

    const result = await engine.localizeText(text, {
      sourceLocale,
      targetLocale,
    });

    return new Response(JSON.stringify({ translation: result }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
```

## Configuration Options

```typescript
const engine = new LingoDotDevEngine({
  apiKey: "your-api-key", // Required: Your Lingo.dev API key
  apiUrl: "https://engine.lingo.dev", // Optional: Custom API URL
  batchSize: 25, // Optional: Max items per batch (1-250)
  idealBatchItemSize: 250, // Optional: Ideal size per batch item (1-2500)
});
```

## Supported Locales

The SDK supports all major language locales including:

- **English**: `en`, `en-US`, `en-GB`, `en-AU`, `en-CA`, etc.
- **Spanish**: `es`, `es-ES`, `es-MX`, `es-AR`, etc.
- **French**: `fr`, `fr-FR`, `fr-CA`, `fr-BE`, etc.
- **German**: `de`, `de-DE`, `de-AT`, `de-CH`
- **Chinese**: `zh`, `zh-CN`, `zh-HK`, `zh-TW`
- **Japanese**: `ja`, `ja-JP`
- **Korean**: `ko`, `ko-KR`
- **And many more...**

See the full list in the [LocaleCode type definition](./src/index.ts).

## Error Handling

The SDK provides comprehensive error handling:

```typescript
try {
  const result = await engine.localizeText("Hello", {
    sourceLocale: "en",
    targetLocale: "invalid-locale",
  });
} catch (error) {
  if (error.message.includes("Server error")) {
    // Handle server errors (5xx)
    console.log("Server is temporarily unavailable");
  } else if (error.message.includes("Invalid request")) {
    // Handle client errors (4xx)
    console.log("Invalid request parameters");
  } else if (error.name === "AbortError") {
    // Handle cancelled requests
    console.log("Request was cancelled");
  } else {
    // Handle other errors
    console.log("Translation failed:", error.message);
  }
}
```

## API Reference

### LingoDotDevEngine

The main class for interacting with the Lingo.dev API.

#### Constructor

```typescript
new LingoDotDevEngine(config: EngineParams)
```

#### Methods

- `localizeText(text, params, progressCallback?, signal?)` - Translate a text string
- `localizeObject(object, params, progressCallback?, signal?)` - Translate an object
- `localizeStringArray(strings, params)` - Translate an array of strings
- `localizeChat(chat, params, progressCallback?, signal?)` - Translate a chat sequence
- `localizeHtml(html, params, progressCallback?, signal?)` - Translate HTML content
- `batchLocalizeText(text, params, signal?)` - Translate to multiple languages
- `recognizeLocale(text, signal?)` - Detect text language
- `whoami(signal?)` - Get user information

### Types

```typescript
interface EngineParams {
  apiKey: string;
  apiUrl?: string;
  batchSize?: number;
  idealBatchItemSize?: number;
}

interface LocalizationParams {
  sourceLocale: LocaleCode | null;
  targetLocale: LocaleCode;
  fast?: boolean;
  reference?: Record<LocaleCode, Record<string, unknown>>;
  hints?: Record<string, string[]>;
}

type LocaleCode = "en" | "es" | "fr" | "de" | "zh" | "ja" | "ko" | ...;
```

## Development & CI/CD

### GitHub Actions Workflows

This repository includes comprehensive CI/CD pipelines:

#### Test Workflow (`test.yml`)

- **Triggers**: Pull requests and pushes to main branch
- **Matrix Testing**: Tests against Deno 1.x and 2.x
- **Quality Checks**:
  - Code formatting (`deno fmt --check`)
  - Linting (`deno lint`)
  - Type checking (`deno check`)
  - Unit tests (`deno test`)
  - Example compilation validation
  - JSR configuration validation

#### Release Workflow (`release.yml`)

- **Triggers**: Tags starting with `v*` and main branch pushes
- **Automated Publishing**:
  - JSR Registry: `@lingodotdev/deno-sdk`
  - Deno Land: `https://deno.land/x/lingodotdev@vX.X.X`
- **GitHub Releases**: Automatic release notes generation
- **Version Management**: Automatic version extraction from git tags

#### Version Bump Workflow (`version-bump.yml`)

- **Trigger**: Manual workflow dispatch
- **Options**:
  - Semantic versioning (patch/minor/major)
  - Custom version specification
- **Process**:
  1. Updates `deno.json` version
  2. Runs full test suite
  3. Creates git commit and tag
  4. Triggers release workflow

#### Security Workflow (`security.yml`)

- **Triggers**: Daily schedule, pushes, and pull requests
- **Security Checks**:
  - Dependency vulnerability scanning
  - Secret detection in source code
  - Security header validation
  - CodeQL analysis

### Release Process

1. **Automatic Releases**: Push tags like `v1.2.3` to trigger releases
2. **Manual Version Bump**: Use GitHub Actions → "Version Bump" workflow
3. **Development**: All PRs are automatically tested

### Local Development

```bash
# Run tests
deno task test

# Check formatting
deno task fmt

# Lint code
deno task lint

# Type check
deno task check

# Validate JSR configuration
deno publish --dry-run
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Support

- 📚 [Documentation](https://docs.lingo.dev)
- 💬 [Discord Community](https://discord.gg/lingo-dev)
- 🐛 [Issue Tracker](https://github.com/lingodotdev/sdk-deno/issues)
- 📧 [Email Support](mailto:support@lingo.dev)
