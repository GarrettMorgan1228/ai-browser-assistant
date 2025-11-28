import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { BAD_BITCH_PERSONA, NOVA_PERSONA } from './personas'

export type Msg = { role: "user" | "assistant"; content: string }; 


/**
 * Build and return a ChatGoogleGenerativeAI model configured
 * from user settings stored in chrome.storage.local.
 */
export async function buildModel() {
  // ---- 1. Load settings the user saved in extension storage ----
  // `apiKeys` is an object like { OpenAI: "sk-...", Google: "AIza..." }
  // `baseModel` is a string like "OpenAI > gpt-4" or "gemini-2.5-flash"
  // `temperature` and `topP` are model tuning values
  const { apiKeys = {}, baseModel, temperature, topP } = await new Promise<any>(resolve =>
    chrome.storage.local.get(["apiKeys", "baseModel", "temperature", "topP"], resolve)
  );

  // ---- 2. Parse provider and model from `baseModel` string ----
  // If user stored "Provider > model", split it; otherwise assume Google/Gemini defaults.
  const parts = (baseModel ?? "").split(" > ");
  const provider = parts.length === 2 ? parts[0] : "Google";        // default provider
  const model = parts.length === 2 ? parts[1] : baseModel || "gemini-2.5-flash"; // default model

  // ---- 3. Pick the correct API key for that provider ----
  // If no key found, apiKey will be empty string — requests will fail until user saves one.
  const apiKey = apiKeys[provider] ?? "";

  // ---- 4. Create and return the LangChain chat model ----
  return new ChatGoogleGenerativeAI({
    apiKey,                                     // user’s saved API key
    model,                                      // selected model name
    temperature: typeof temperature === "number" ? temperature : 0.7, // fallback if unset
    topP: typeof topP === "number" ? topP : 0.95,                      // fallback if unset
  });
}

export async function chatOnce(
  history: Msg[],
  signal?: AbortSignal,
  persona: string = NOVA_PERSONA
): Promise<string> {
  const model = await buildModel();

  // Construct the message array for the model
  const msgs = [
    new SystemMessage(persona),
    ...history.map(m =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
  ];

  // Invoke the model with the constructed messages
  const res = await model.invoke(msgs, { signal });
  // res.content can be string or structured; normalize to string
  return Array.isArray(res.content)
    ? res.content.map(p => ("text" in p ? p.text : "")).join("")
    : String(res.content ?? "");
}
