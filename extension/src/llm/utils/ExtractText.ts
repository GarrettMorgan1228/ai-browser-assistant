
// Get the active tab ID
export async function getActiveTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error("No active tab found.");
  return tab.id;
}

// Extract readable text from the page
export async function extractPageText(tabId: number, maxChars: number): Promise<string> {
  const injection = await chrome.scripting.executeScript({
    target: { tabId },
    func: (cap: number) => {
      // Helper to collapse whitespace and cap length
      const collapse = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, cap);

      // Try to get user selection first
      const selection = window.getSelection?.()?.toString()?.trim() ?? "";  
      if (selection.length > 40) return collapse(selection);

      // Fallback to main content extraction
      const article = document.querySelector("article");
      const main = document.querySelector("main");
      const raw =
        article?.textContent ||
        main?.textContent ||
        document.body?.textContent ||
        "";

      return collapse(raw);
    },
    args: [maxChars],
  });

  const result = injection?.[0]?.result ?? "";
  if (typeof result !== "string" || result.length < 20) {
    throw new Error("Could not extract readable text from the page.");
  }
  return result;
}

// Build prompt for summarization
export function buildSummaryPrompt(text: string): string {
  return [
    "Summarize the following webpage content.",
    "Return:",
    "1) A 1-sentence overview",
    "2) 3-6 key bullet points",
    "3) Any notable names/figures (if present)",
    "",
    "WEBPAGE CONTENT:",
    text,
  ].join("\n");
}