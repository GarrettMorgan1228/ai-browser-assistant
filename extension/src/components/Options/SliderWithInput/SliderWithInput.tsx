import { useEffect, useState } from "react";
import styles from "./SliderWithInput.module.css";

type Props = {
  Max: number;
  storageKey: string;        // e.g., "temperature" or "topP"
  defaultValue?: number;     // fallback if nothing in storage
};

// Slider with synchronized range and number inputs, persisting to chrome.storage
export default function SliderWithInput({ Max, storageKey, defaultValue = 0 }: Props) {
  const [value, setValue] = useState<number>(defaultValue);

  // load once
  useEffect(() => {
    chrome.storage.local.get([storageKey], (res) => {
      if (typeof res[storageKey] === "number") setValue(res[storageKey]);
    });
  }, [storageKey]);

  // save on change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setValue(next);
    chrome.storage.local.set({ [storageKey]: next });
  };

  return (
    <div className={styles.root}>
      <input
        type="range"
        min="0"
        max={Max}
        step="0.01"
        value={value}
        onChange={handleChange}
        className={styles.range}
      />
      <input
        type="number"
        min="0"
        max={Max}
        step="0.01"
        value={value}
        onChange={handleChange}
        className={styles.number}
      />
    </div>
  );
}
