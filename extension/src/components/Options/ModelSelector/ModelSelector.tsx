import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import styles from "./ModelSelector.module.css";
import { Provider } from "../ProviderSelector/ProviderSelector";

export default function ModelSelector({ options }: { options: Provider[] }) {
  const [selectedModel, setSelectedModel] = useState<string>("Choose model"); // Placeholder for selected model
  const [open, setOpen] = useState(false); // State to track if the dropdown is open
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom"); // Dropdown placement
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container div
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the dropdown menu

  //` Load saved model on mount
  useEffect(() => {
    // load any saved selection on mount
    chrome.storage.local.get(["baseModel"], (res) => {
      if (res.baseModel) setSelectedModel(res.baseModel);
    });
  }, []);

  // Toggle dropdown visibility
  function handleToggle() {
    setOpen((prev) => !prev);
  }

  // Handle provider selection
  function handleOptionToggle(model: string) {
    setSelectedModel(model); // Placeholder
    setOpen((prev) => !prev);
    // save whenever user picks a model
    chrome.storage.local.set({ baseModel: model });
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        event.target &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset if current selection is no longer in options
  useEffect(() => {
    const all = new Set<string>([
      "Choose model",
      ...options.flatMap((p) => p.models.map((m) => `${p.name} > ${m}`)),
    ]);
    if (!all.has(selectedModel)) {
      setSelectedModel("Choose model");
    }
  }, [options, selectedModel]);

  // React to external storage changes (e.g., baseModel removed on provider delete)
  useEffect(() => {
    function handler(
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) {
      if (area !== "local" || !changes.baseModel) return;
      const next = changes.baseModel.newValue as string | undefined;
      setSelectedModel(next ?? "Choose model");
    }
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // When opening, decide top or bottom
  useLayoutEffect(() => {
    // Only run if opening and refs are set
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.scrollHeight ?? 0;

    // Calculate available space above and below the button
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      setPlacement("top"); // Place above if not enough space below
    } else {
      setPlacement("bottom"); // Default to below
    }
  }, [open]);

  // Render component
  return (
    <div className={styles.container} ref={containerRef}>
      <button className={styles.button} onClick={handleToggle}>
        <span>{selectedModel}</span>
        <span className={styles.caret}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`${styles.dropdown} ${
            placement === "top" ? styles.dropdownTop : styles.dropdownBottom
          }`}
        >
          <button
            className={styles.dropdownItem}
            onClick={() => handleOptionToggle("Choose model")}
          >
            Choose model
          </button>
          {options.flatMap((provider) =>
            provider.models.map((model) => (
              <button
                className={styles.dropdownItem}
                onClick={() =>
                  handleOptionToggle(`${provider.name} > ${model}`)
                }
                key={`${provider.name}-${model}`}
              >
                {provider.name} {">"} {model}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
