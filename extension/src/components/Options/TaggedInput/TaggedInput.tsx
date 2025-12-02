import { useCallback, useMemo, useRef, useState } from "react";
import styles from "./TaggedInput.module.css";

// Props for the TagsInput component
type Props = {
  value: string[]; // lifted state
  onChange: (next: string[]) => void; // setter from parent
};

// Input for comma- or space-separated tags, with add/remove functionality
export default function TagsInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState(""); // current input value
  const inputRef = useRef<HTMLInputElement>(null); // ref for the input element

  // lowercase set for quick duplicate checking
  // (recreated only when value changes)
  const lowerSet = useMemo(
    () => new Set(value.map((t) => t.toLowerCase())),
    [value]
  );

  // split by whitespace or commas, trim, and filter out empties
  const tokenize = (s: string) =>
    s
      .split(/[\s,]+/g)
      .map((x) => x.trim())
      .filter(Boolean);

  // add a single tag if not empty or duplicate
  // (used for paste handling)
  const addOne = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      if (lowerSet.has(t.toLowerCase())) return;
      onChange([...value, t]);
    },
    [lowerSet, onChange, value]
  );

  // add all tags from draft input, then clear it
  // (used for Enter/Space handling)
  const addFromDraft = useCallback(() => {
    if (!draft.trim()) return;
    const toAdd = tokenize(draft).filter((t) => !lowerSet.has(t.toLowerCase()));
    if (toAdd.length) onChange([...value, ...toAdd]);
    setDraft("");
  }, [draft, lowerSet, onChange, value]);

  // remove tag at index i
  const removeAt = (i: number) => onChange(value.filter((_, k) => k !== i));

  // handle key events in the input
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if ((e.key === "Enter" || e.key === " ") && draft.trim()) {
      // add tag
      e.preventDefault();
      addFromDraft();
    } else if (
      e.key === "Backspace" &&
      draft.length === 0 &&
      value.length > 0
    ) {
      // remove last tag
      e.preventDefault();
      removeAt(value.length - 1);
    }
  };

  // handle paste events in the input
  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();
    tokenize(text).forEach(addOne);
  };

  // Render component
  return (
    <div className={styles["tags-field"]}>
      <div className={styles["tags-input"]} role="list">
        {value.map((t, i) => (
          <span key={`${t}-${i}`} className={styles["tag"]} role="listitem">
            <span className={styles["tag-label"]}>{t}</span>
            <button
              type="button"
              className={styles["tag-remove"]}
              aria-label={`Remove ${t}`}
              onClick={() => removeAt(i)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className={styles["tag-input"]}
          aria-label="Add model"
        />
      </div>
      <p className={styles["tags-help"]}>
        Type and press Enter or Space to add.
      </p>
    </div>
  );
}
