"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRouter = void 0;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class LLMRouter {
    constructor() {
        this.openai = null;
        this.claude = null;
    }
    setApiKey(key) {
        this.openai = key ? new openai_1.default({ apiKey: key }) : null;
    }
    setClaudeKey(key) {
        this.claude = key ? new sdk_1.default({ apiKey: key }) : null;
    }
    async run(model, prompt, onToken) {
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
    async runGPT(prompt, onToken) {
        let full = "";
        const stream = await this.openai.chat.completions.create({
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
    async runClaude(prompt, onToken) {
        let full = "";
        const stream = await this.claude.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }],
        });
        for await (const event of stream) {
            if (event.type === "content_block_delta") {
                const delta = event.delta;
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
    async error(msg, onToken) {
        const text = "ERROR: " + msg + "\n";
        for (const ch of text) {
            await new Promise((r) => setTimeout(r, 2));
            onToken?.(ch);
        }
        return text;
    }
}
exports.LLMRouter = LLMRouter;
