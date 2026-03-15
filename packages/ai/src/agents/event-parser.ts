import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EdlSchema, type Edl } from "@uniapp/edl";
import { getAnthropicClient } from "../client.js";
import {
  buildEventParserSystemPrompt,
  type CityContext,
} from "../prompts/event-parser.js";

export interface ParseEventInput {
  input: string;
  city: CityContext;
}

export interface ParseEventResult {
  edl: Edl;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
}

export class EventRefusalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventRefusalError";
  }
}

export class EventParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventParseError";
  }
}

export async function parseEventFromNaturalLanguage(
  input: ParseEventInput,
): Promise<ParseEventResult> {
  if (!input.input.trim()) {
    throw new EventParseError("Event description cannot be empty");
  }

  const client = getAnthropicClient();
  const systemPrompt = buildEventParserSystemPrompt(input.city);

  const response = await client.messages.parse({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    // Cache the system prompt — it's large and reused across requests for same city
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: input.input,
      },
    ],
    output_config: {
      format: zodOutputFormat(EdlSchema),
    },
  });

  // Handle refusal
  if (response.stop_reason === "refusal") {
    throw new EventRefusalError(
      "This event description was flagged as unsafe or violates platform policies",
    );
  }

  const edl = response.parsed_output;
  if (!edl) {
    throw new EventParseError(
      "Failed to parse event description into a valid EDL structure",
    );
  }

  return {
    edl,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
