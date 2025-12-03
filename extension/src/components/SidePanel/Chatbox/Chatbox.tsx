import { useRef, useState, useEffect } from "react";
import styles from "./Chatbox.module.css";
import { chatOnce, type Msg } from "../../../llm/gemini";
import {
  extractPageText,
  getActiveTabId,
  buildSummaryPrompt,
} from "../../../llm/utils/ExtractText";

// Simple chatbox interface with message history, input area, and send/stop buttons
function LoadingBubble() {
  return (
    <div className={`${styles.bubble} ${styles["bot-message"]}`}>
      <div className={styles.loading}>
        <div className={styles.line}></div>
        <div className={styles.line}></div>
        <div className={styles.line}></div>
      </div>
    </div>
  );
}

// Single message bubble, styled based on role (user or assistant)
function Bubble({ m, showCursor }: { m: Msg; showCursor?: boolean }) {
  const cls =
    m.role === "assistant"
      ? `${styles.bubble} ${styles["bot-message"]}`
      : `${styles.bubble} ${styles["user-message"]}`;
  return (
    <div className={cls}>
      <span>
        {m.content}
        {showCursor && <span className={styles.cursor}></span>}
      </span>
    </div>
  );
}

// Main chatbox component
export default function Chatbox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const typeTimerRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const runIdRef = useRef(0);
  const cancelledRef = useRef(false);

  // scroll to bottom on new messages, loading, or typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, typing]);

  // add run id to typewrite
  function typewrite(text: string, speedMs = 12, runId = runIdRef.current) {
    setTyping(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    let i = 0;
    typeTimerRef.current = window.setInterval(() => {
      // bail if stopped or superseded
      if (cancelledRef.current || runId !== runIdRef.current) {
        if (typeTimerRef.current) clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        setTyping(false);
        return;
      }
      i++;
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        if (!last || last.role !== "assistant") return prev;
        next[next.length - 1] = { ...last, content: text.slice(0, i) };
        return next;
      });
      if (i >= text.length) {
        if (typeTimerRef.current) clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        setTyping(false);
      }
    }, speedMs);
  }

  // send current input to model and handle response
  async function send(customText?: string) {
    const text = (customText ?? input).trim();
    if (!text || loading || typing) return;

    const nextMsgs = [...messages, { role: "user", content: text } as Msg];
    setMessages(nextMsgs);

    // Only clear the box if we're sending from the textarea
    if (!customText) setInput("");

    // start a new run
    const myRun = ++runIdRef.current;
    cancelledRef.current = false;

    setLoading(true);
    abortRef.current = new AbortController();
    try {
      const reply = await chatOnce(nextMsgs, abortRef.current.signal);
      // ignore late/aborted results
      if (cancelledRef.current || myRun !== runIdRef.current) return;
      setLoading(false);
      typewrite(reply, 12, myRun);
    } catch {
      if (!cancelledRef.current) {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error calling model." },
        ]);
      }
    } finally {
      if (myRun === runIdRef.current) abortRef.current = null;
    }
  }

  async function sendHiddenPrompt(displayText: string, promptText: string) {
    if (loading || typing) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: displayText } as Msg,
    ]);

    const myRun = ++runIdRef.current;
    cancelledRef.current = false;

    setLoading(true);
    abortRef.current = new AbortController();

    try {
      // IMPORTANT: model gets promptText, but UI shows displayText
      const modelMsgs = [
        ...messages,
        { role: "user", content: promptText } as Msg,
      ];
      const reply = await chatOnce(modelMsgs, abortRef.current.signal);

      if (cancelledRef.current || myRun !== runIdRef.current) return;
      setLoading(false);
      typewrite(reply, 12, myRun);
    } catch {
      if (!cancelledRef.current) {
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error calling model." },
        ]);
      }
    } finally {
      if (myRun === runIdRef.current) abortRef.current = null;
    }
  }

  // send a summary prompt
  async function sendSummary() {
    if (loading || typing) return;

    try {
      const tabId = await getActiveTabId();
      const pageText = await extractPageText(tabId, 12000);
      const summaryPrompt = buildSummaryPrompt(pageText);

      await sendHiddenPrompt(
        "Summarize the current page, please.",
        summaryPrompt
      );
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Could not read this page. If this is a restricted page or missing permissions, try another site.\n\n" +
            String(e?.message ?? e),
        },
      ]);
    }
  }

  // stop current request or typing
  function stop() {
    cancelledRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    if (typeTimerRef.current) {
      clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    setLoading(false);
    setTyping(false);
  }

  function clearChat() {
    stop();
    setMessages([]);
  }

  return (
    <div className={styles["chatbox-wrapper"]}>
      <div className={styles.toolbar}>
        <div className={styles.title}>
          <span>PAGE SUMMARY / Q&A</span>
        </div>
        <div className={styles["toolbar-buttons"]}>
          <button
            className={styles["toolbar-button"]}
            title="Clear Chat"
            onClick={clearChat}
          >
            🗑️
          </button>
          <button
            className={styles["settings-button"]}
            title="Settings"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className={styles["chat-container"]}>
        {messages.map((m, i) => (
          <Bubble
            key={i}
            m={m}
            showCursor={
              typing && i === messages.length - 1 && m.role === "assistant"
            }
          />
        ))}
        {loading && <LoadingBubble />}
        <div ref={bottomRef} />
      </div>

      <div className={styles["input-container"]}>
        <div className={styles["input-row"]}>
          <textarea
            className={styles["message-input"]}
            placeholder="Ask anything about the current page..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className={styles["send-btn"]} onClick={() => send()} disabled={!input.trim() || loading || typing}>
            ASK
          </button>
          <button className={styles["stop-btn"]} onClick={stop} disabled={!loading && !typing}>
            STOP
          </button>
        </div>
        {/* Summarize button here */}
        <button onClick={sendSummary} disabled={loading || typing} className={styles["summarize-btn"]}>
          SUMMARIZE
        </button>
      </div>
    </div>
  );
}
