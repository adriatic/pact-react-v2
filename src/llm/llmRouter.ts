export type LLMModel = "gpt" | "claude";

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export class LLMRouter {
  private openai: OpenAI | null = null;
  private claude: Anthropic | null = null;

  setApiKey(key: string | undefined) {
    this.openai = key ? new OpenAI({ apiKey: key }) : null;
  }

  setClaudeKey(key: string | undefined) {
    this.claude = key ? new Anthropic({ apiKey: key }) : null;
  }

  async run(
    model: LLMModel,
    prompt: string,
    onToken?: (t: string) => void
  ): Promise<string> {
    if (model === "gpt") {
      if (!this.openai) {
        return this.error("OpenAI API key not set", onToken);
      }
      return this.runGPT(prompt, onToken);
    }

    if (model === "claude") {
      if (!this.claude) {
        return this.error("Claude API key not set", onToken);
      }
      return this.runClaude(prompt, onToken);
    }

    return this.error("Unknown model", onToken);
  }

  private async runGPT(
    prompt: string,
    onToken?: (t: string) => void
  ): Promise<string> {
    let full = "";

    const stream = await this.openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        full += token;
        onToken?.(token);
      }
    }

    return full;
  }

  private async runClaude(
    prompt: string,
    onToken?: (t: string) => void
  ): Promise<string> {
    let full = "";

    const stream = await this.claude!.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        const delta: any = event.delta;

        // ✅ SAFE extraction
        if (delta.type === "text_delta") {
          const token = delta.text || "";
          full += token;
          onToken?.(token);
        }
      }
    }

    return full;
  }

  private async error(msg: string, onToken?: (t: string) => void) {
    const text = "ERROR: " + msg + "\n";

    for (const ch of text) {
      await new Promise((r) => setTimeout(r, 2));
      onToken?.(ch);
    }

    return text;
  }
}