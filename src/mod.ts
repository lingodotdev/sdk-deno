import type { LocaleCode } from "./types.ts";

// Simple ID generator for Deno (no external dependencies)
function createId(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Simple Zod-like validation interfaces for Deno
export interface EngineParams {
  apiKey: string;
  apiUrl?: string;
  batchSize?: number;
  idealBatchItemSize?: number;
}

export interface LocalizationParams {
  sourceLocale: LocaleCode | null;
  targetLocale: LocaleCode;
  fast?: boolean;
  reference?: Record<LocaleCode, Record<string, unknown>>;
  hints?: Record<string, string[]>;
}

function validateEngineParams(config: Partial<EngineParams>): EngineParams {
  if (!config.apiKey) {
    throw new Error("apiKey is required");
  }

  return {
    apiKey: config.apiKey,
    apiUrl: config.apiUrl ?? "https://engine.lingo.dev",
    batchSize: config.batchSize ?? 25,
    idealBatchItemSize: config.idealBatchItemSize ?? 250,
  };
}

function validateLocalizationParams(
  params: LocalizationParams,
): LocalizationParams {
  if (!params.targetLocale) {
    throw new Error("targetLocale is required");
  }

  return params;
}

/**
 * LingoDotDevEngine class for Deno runtime
 * A powerful localization engine that supports various content types including
 * plain text, objects, chat sequences, and HTML documents.
 * Optimized for Edge Runtime and Supabase Functions
 * No external dependencies required
 */
export class LingoDotDevEngine {
  protected config: EngineParams;

  /**
   * Create a new LingoDotDevEngine instance for Deno
   * @param config - Configuration options for the Engine
   */
  constructor(config: Partial<EngineParams>) {
    this.config = validateEngineParams(config);
  }

  /**
   * Localize content using the Lingo.dev API
   * @param payload - The content to be localized
   * @param params - Localization parameters including source/target locales and fast mode option
   * @param progressCallback - Optional callback function to report progress (0-100)
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns Localized content
   * @internal
   */
  async _localizeRaw(
    payload: Record<string, unknown>,
    params: LocalizationParams,
    progressCallback?: (
      progress: number,
      sourceChunk: Record<string, string>,
      processedChunk: Record<string, string>,
    ) => void,
    signal?: AbortSignal,
  ): Promise<Record<string, string>> {
    const finalParams = validateLocalizationParams(params);
    const chunkedPayload = this.extractPayloadChunks(payload);
    const processedPayloadChunks: Record<string, string>[] = [];

    const workflowId = createId();
    for (let i = 0; i < chunkedPayload.length; i++) {
      const chunk = chunkedPayload[i];
      const percentageCompleted = Math.round(
        ((i + 1) / chunkedPayload.length) * 100,
      );

      const processedPayloadChunk = await this.localizeChunk(
        finalParams.sourceLocale,
        finalParams.targetLocale,
        { data: chunk, reference: params.reference, hints: params.hints },
        workflowId,
        params.fast || false,
        signal,
      );

      if (progressCallback) {
        progressCallback(percentageCompleted, chunk, processedPayloadChunk);
      }

      processedPayloadChunks.push(processedPayloadChunk);
    }

    return Object.assign({}, ...processedPayloadChunks);
  }

  /**
   * Localize a single chunk of content
   * @param sourceLocale - Source locale
   * @param targetLocale - Target locale
   * @param payload - Payload containing the chunk to be localized
   * @param workflowId - Workflow ID for tracking
   * @param fast - Whether to use fast mode
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns Localized chunk
   */
  private async localizeChunk(
    sourceLocale: string | null,
    targetLocale: string,
    payload: {
      data: Record<string, string>;
      reference?: Record<LocaleCode, Record<string, unknown>>;
      hints?: Record<string, string[]>;
    },
    workflowId: string,
    fast: boolean,
    signal?: AbortSignal,
  ): Promise<Record<string, string>> {
    const res = await fetch(`${this.config.apiUrl}/i18n`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(
        {
          params: { workflowId, fast },
          locale: {
            source: sourceLocale,
            target: targetLocale,
          },
          data: payload.data,
          reference: payload.reference,
          hints: payload.hints,
        },
        null,
        2,
      ),
      signal,
    });

    if (!res.ok) {
      if (res.status >= 500 && res.status < 600) {
        const errorText = await res.text();
        throw new Error(
          `Server error (${res.status}): ${res.statusText}. ${errorText}. This may be due to temporary service issues.`,
        );
      } else if (res.status === 400) {
        throw new Error(`Invalid request: ${res.statusText}`);
      } else {
        const errorText = await res.text();
        throw new Error(errorText);
      }
    }

    const jsonResponse = await res.json();

    // when streaming the error is returned in the response body
    if (!jsonResponse.data && jsonResponse.error) {
      throw new Error(jsonResponse.error);
    }

    return jsonResponse.data || {};
  }

  /**
   * Extract payload chunks based on the ideal chunk size
   * @param payload - The payload to be chunked
   * @returns An array of payload chunks
   */
  private extractPayloadChunks(
    payload: Record<string, unknown>,
  ): Record<string, string>[] {
    const result: Record<string, string>[] = [];
    let currentChunk: Record<string, string> = {};
    let currentChunkItemCount = 0;

    const payloadEntries = Object.entries(payload);
    for (let i = 0; i < payloadEntries.length; i++) {
      const [key, value] = payloadEntries[i];
      if (typeof value === "string") {
        currentChunk[key] = value;
        currentChunkItemCount++;

        const currentChunkSize = this.countWordsInRecord(currentChunk);
        if (
          currentChunkSize > (this.config.idealBatchItemSize || 250) ||
          currentChunkItemCount >= (this.config.batchSize || 25) ||
          i === payloadEntries.length - 1
        ) {
          result.push(currentChunk);
          currentChunk = {};
          currentChunkItemCount = 0;
        }
      }
    }

    return result;
  }

  /**
   * Count words in a record or array
   * @param payload - The payload to count words in
   * @returns The total number of words
   */
  private countWordsInRecord(
    payload: unknown | Record<string, unknown> | Array<unknown>,
  ): number {
    if (Array.isArray(payload)) {
      return payload.reduce(
        (acc, item) => acc + this.countWordsInRecord(item),
        0,
      );
    } else if (typeof payload === "object" && payload !== null) {
      return Object.values(payload).reduce(
        (acc: number, item) => acc + this.countWordsInRecord(item),
        0,
      );
    } else if (typeof payload === "string") {
      return payload.trim().split(/\s+/).filter(Boolean).length;
    } else {
      return 0;
    }
  }

  /**
   * Localize a typical JavaScript object
   * @param obj - The object to be localized (strings will be extracted and translated)
   * @param params - Localization parameters:
   *   - sourceLocale: The source language code (e.g., 'en')
   *   - targetLocale: The target language code (e.g., 'es')
   *   - fast: Optional boolean to enable fast mode (faster but potentially lower quality)
   * @param progressCallback - Optional callback function to report progress (0-100)
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns A new object with the same structure but localized string values
   */
  async localizeObject(
    obj: Record<string, unknown>,
    params: LocalizationParams,
    progressCallback?: (
      progress: number,
      sourceChunk: Record<string, string>,
      processedChunk: Record<string, string>,
    ) => void,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    return await this._localizeRaw(obj, params, progressCallback, signal);
  }

  /**
   * Localize a single text string
   * @param text - The text string to be localized
   * @param params - Localization parameters:
   *   - sourceLocale: The source language code (e.g., 'en')
   *   - targetLocale: The target language code (e.g., 'es')
   *   - fast: Optional boolean to enable fast mode (faster for bigger batches)
   * @param progressCallback - Optional callback function to report progress (0-100)
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns The localized text string
   */
  async localizeText(
    text: string,
    params: LocalizationParams,
    progressCallback?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const response = await this._localizeRaw(
      { text },
      params,
      progressCallback,
      signal,
    );
    return response.text || "";
  }

  /**
   * Localize a text string to multiple target locales
   * @param text - The text string to be localized
   * @param params - Localization parameters:
   *   - sourceLocale: The source language code (e.g., 'en')
   *   - targetLocales: An array of target language codes (e.g., ['es', 'fr'])
   *   - fast: Optional boolean to enable fast mode (for bigger batches)
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns An array of localized text strings
   */
  async batchLocalizeText(
    text: string,
    params: {
      sourceLocale: LocaleCode;
      targetLocales: LocaleCode[];
      fast?: boolean;
    },
    signal?: AbortSignal,
  ): Promise<string[]> {
    const responses = await Promise.all(
      params.targetLocales.map((targetLocale) =>
        this.localizeText(
          text,
          {
            sourceLocale: params.sourceLocale,
            targetLocale,
            fast: params.fast,
          },
          undefined,
          signal,
        )
      ),
    );

    return responses;
  }

  /**
   * Localize an array of strings
   * @param strings - An array of strings to be localized
   * @param params - Localization parameters:
   *   - sourceLocale: The source language code (e.g., 'en')
   *   - targetLocale: The target language code (e.g., 'es')
   *   - fast: Optional boolean to enable fast mode (faster for bigger batches)
   * @returns An array of localized strings in the same order
   */
  async localizeStringArray(
    strings: string[],
    params: LocalizationParams,
  ): Promise<string[]> {
    const mapped = strings.reduce(
      (acc, str, i) => {
        acc[`item_${i}`] = str;
        return acc;
      },
      {} as Record<string, string>,
    );

    const result = await this.localizeObject(mapped, params);
    return Object.values(result).map((value) => String(value));
  }

  /**
   * Localize a chat sequence while preserving speaker names
   * @param chat - Array of chat messages, each with 'name' and 'text' properties
   * @param params - Localization parameters:
   *   - sourceLocale: The source language code (e.g., 'en')
   *   - targetLocale: The target language code (e.g., 'es')
   *   - fast: Optional boolean to enable fast mode (faster but potentially lower quality)
   * @param progressCallback - Optional callback function to report progress (0-100)
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns Array of localized chat messages with preserved structure
   */
  async localizeChat(
    chat: Array<{ name: string; text: string }>,
    params: LocalizationParams,
    progressCallback?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<Array<{ name: string; text: string }>> {
    // Convert chat to a string record format
    const chatRecord = chat.reduce(
      (acc, message, index) => {
        acc[`chat_${index}`] = message.text;
        return acc;
      },
      {} as Record<string, string>,
    );

    const localized = await this._localizeRaw(
      chatRecord,
      params,
      progressCallback,
      signal,
    );

    return Object.entries(localized).map(([key, value]) => ({
      name: chat[parseInt(key.split("_")[1])].name,
      text: value,
    }));
  }

  /**
   * Localize an HTML document while preserving structure and formatting
   * Handles both text content and localizable attributes (alt, title, placeholder, meta content)
   * @param html - The HTML document string to be localized
   * @param params - Localization parameters:
   *   - sourceLocale: The source language code (e.g., 'en')
   *   - targetLocale: The target language code (e.g., 'es')
   *   - fast: Optional boolean to enable fast mode (faster but potentially lower quality)
   * @param progressCallback - Optional callback function to report progress (0-100)
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns The localized HTML document as a string, with updated lang attribute
   */
  async localizeHtml(
    html: string,
    params: LocalizationParams,
    progressCallback?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    // Check if DOMParser is available (it's available in Deno with --allow-env flag)
    if (typeof DOMParser === "undefined") {
      // Fallback to a simple regex-based approach for environments without DOMParser
      return this.localizeHtmlSimple(html, params, progressCallback, signal);
    }

    // Use DOMParser when available
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const LOCALIZABLE_ATTRIBUTES: Record<string, string[]> = {
      meta: ["content"],
      img: ["alt"],
      input: ["placeholder"],
      a: ["title"],
    };
    const UNLOCALIZABLE_TAGS = ["script", "style"];

    const extractedContent: Record<string, string> = {};

    const getPath = (node: Node, attribute?: string): string => {
      const indices: number[] = [];
      let current = node as ChildNode;
      let rootParent = "";

      while (current) {
        const parent = current.parentElement as Element;
        if (!parent) break;

        if (parent === doc.documentElement) {
          rootParent = current.nodeName.toLowerCase();
          break;
        }

        const siblings = Array.from(parent.childNodes).filter(
          (n) =>
            n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()),
        );
        const index = siblings.indexOf(current);
        if (index !== -1) {
          indices.unshift(index);
        }
        current = parent;
      }

      const basePath = rootParent
        ? `${rootParent}/${indices.join("/")}`
        : indices.join("/");
      return attribute ? `${basePath}#${attribute}` : basePath;
    };

    const processNode = (node: Node) => {
      let parent = node.parentElement;
      while (parent) {
        if (UNLOCALIZABLE_TAGS.includes(parent.tagName.toLowerCase())) {
          return;
        }
        parent = parent.parentElement;
      }

      if (node.nodeType === 3) {
        const text = node.textContent?.trim() || "";
        if (text) {
          extractedContent[getPath(node)] = text;
        }
      } else if (node.nodeType === 1) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        const attributes = LOCALIZABLE_ATTRIBUTES[tagName] || [];
        attributes.forEach((attr) => {
          const value = element.getAttribute(attr);
          if (value) {
            extractedContent[getPath(element, attr)] = value;
          }
        });

        Array.from(element.childNodes)
          .filter(
            (n) =>
              n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()),
          )
          .forEach(processNode);
      }
    };

    if (doc.head) {
      Array.from(doc.head.childNodes)
        .filter(
          (n) =>
            n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()),
        )
        .forEach(processNode);
    }

    if (doc.body) {
      Array.from(doc.body.childNodes)
        .filter(
          (n) =>
            n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()),
        )
        .forEach(processNode);
    }

    const localizedContent = await this._localizeRaw(
      extractedContent,
      params,
      progressCallback,
      signal,
    );

    // Update the DOM with localized content
    if (doc.documentElement) {
      doc.documentElement.setAttribute("lang", params.targetLocale);
    }

    Object.entries(localizedContent).forEach(([path, value]) => {
      const [nodePath, attribute] = path.split("#");
      const [rootTag, ...indices] = nodePath.split("/");

      let parent: Element = rootTag === "head" && doc.head
        ? doc.head
        : doc.body!;
      let current: Node | null = parent;

      for (const index of indices) {
        const siblings = Array.from(parent.childNodes).filter(
          (n) =>
            n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()),
        );
        current = siblings[parseInt(index)] || null;
        if (current?.nodeType === 1) {
          parent = current as Element;
        }
      }

      if (current) {
        if (attribute) {
          (current as Element).setAttribute(attribute, value);
        } else {
          current.textContent = value;
        }
      }
    });

    return doc.documentElement?.outerHTML || html;
  }

  /**
   * Simple HTML localization fallback for environments without DOMParser
   */
  private async localizeHtmlSimple(
    html: string,
    params: LocalizationParams,
    progressCallback?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    // Simple regex-based extraction of text content and common attributes
    const extractedContent: Record<string, string> = {};
    let counter = 0;

    // Extract text content between tags (excluding script and style)
    let tempHtml = html;

    // Remove script and style content
    tempHtml = tempHtml.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
    tempHtml = tempHtml.replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      "",
    );

    // Extract text content
    const textMatches = tempHtml.match(/>([^<]+)</g);
    if (textMatches) {
      textMatches.forEach((match) => {
        const text = match.slice(1, -1).trim();
        if (text && text.length > 0) {
          extractedContent[`text_${counter++}`] = text;
        }
      });
    }

    // Extract common localizable attributes
    const attributePatterns = [
      /title="([^"]+)"/gi,
      /alt="([^"]+)"/gi,
      /placeholder="([^"]+)"/gi,
      /content="([^"]+)"/gi,
    ];

    attributePatterns.forEach((pattern, patternIndex) => {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim()) {
          extractedContent[`attr_${patternIndex}_${counter++}`] = match[1];
        }
      }
    });

    // Translate the extracted content
    const localizedContent = await this._localizeRaw(
      extractedContent,
      params,
      progressCallback,
      signal,
    );

    // Replace the content back in the HTML
    let localizedHtml = html;

    // Update lang attribute
    localizedHtml = localizedHtml.replace(
      /<html([^>]*)>/i,
      `<html$1 lang="${params.targetLocale}">`,
    );

    // Replace text content and attributes
    Object.entries(localizedContent).forEach(([key, value]) => {
      const originalValue = extractedContent[key];
      if (originalValue) {
        // Escape special regex characters
        const escapedOriginal = originalValue.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        const regex = new RegExp(escapedOriginal, "g");
        localizedHtml = localizedHtml.replace(regex, value);
      }
    });

    return localizedHtml;
  }

  /**
   * Detect the language of a given text
   * @param text - The text to analyze
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns Promise resolving to a locale code (e.g., 'en', 'es', 'fr')
   */
  async recognizeLocale(
    text: string,
    signal?: AbortSignal,
  ): Promise<LocaleCode> {
    const response = await fetch(`${this.config.apiUrl}/recognize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ text }),
      signal,
    });

    if (!response.ok) {
      if (response.status >= 500 && response.status < 600) {
        throw new Error(
          `Server error (${response.status}): ${response.statusText}. This may be due to temporary service issues.`,
        );
      }
      throw new Error(`Error recognizing locale: ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    return jsonResponse.locale;
  }

  /**
   * Get user information
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns User information including email and id, or null if not authenticated
   */
  async whoami(
    signal?: AbortSignal,
  ): Promise<{ email: string; id: string } | null> {
    try {
      const res = await fetch(`${this.config.apiUrl}/whoami`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          ContentType: "application/json",
        },
        signal,
      });

      if (res.ok) {
        const payload = await res.json();
        if (!payload?.email) {
          return null;
        }

        return {
          email: payload.email,
          id: payload.id,
        };
      }

      if (res.status >= 500 && res.status < 600) {
        throw new Error(
          `Server error (${res.status}): ${res.statusText}. This may be due to temporary service issues.`,
        );
      }

      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Server error")) {
        throw error;
      }
      return null;
    }
  }
}

/**
 * @deprecated Use LingoDotDevEngine instead. This class is maintained for backwards compatibility.
 */
export class ReplexicaEngine extends LingoDotDevEngine {
  private static hasWarnedDeprecation = false;

  constructor(config: Partial<EngineParams>) {
    super(config);
    if (!ReplexicaEngine.hasWarnedDeprecation) {
      console.warn(
        "ReplexicaEngine is deprecated and will be removed in a future release. " +
          "Please use LingoDotDevEngine instead. " +
          "See https://lingo.dev/cli for more information.",
      );
      ReplexicaEngine.hasWarnedDeprecation = true;
    }
  }
}

/**
 * @deprecated Use LingoDotDevEngine instead. This class is maintained for backwards compatibility.
 */
export class LingoEngine extends LingoDotDevEngine {
  private static hasWarnedDeprecation = false;

  constructor(config: Partial<EngineParams>) {
    super(config);
    if (!LingoEngine.hasWarnedDeprecation) {
      console.warn(
        "LingoEngine is deprecated and will be removed in a future release. " +
          "Please use LingoDotDevEngine instead. " +
          "See https://lingo.dev/cli for more information.",
      );
      LingoEngine.hasWarnedDeprecation = true;
    }
  }
}

// Export types
export type { LocaleCode } from "./types.ts";
