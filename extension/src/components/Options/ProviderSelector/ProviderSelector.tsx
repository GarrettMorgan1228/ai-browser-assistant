import { useState, useRef, useEffect } from "react";
import styles from "./ProviderSelector.module.css";

export type Provider = {
  name: string;
  models: string[];
};

// Dropdown to select and add a provider from a list of options
export default function ProviderSelector({
  options,
  onSelect,
}: {
  options: Provider[];
  onSelect: (p: Provider) => void;
}) {
  const [open, setOpen] = useState(false); // State to track if the dropdown is open
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container div

  // Toggle dropdown visibility
  function handleToggle() {
    setOpen((prev) => !prev);
  }

  // Handle provider selection
  function choose(p: Provider) {
    setOpen(false);
    onSelect(p);
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

  // Render component
  return (
    <div className={styles.container} ref={containerRef}>
      <button className={styles.button} onClick={handleToggle}>
        <span className={styles.icon}>+</span>
        <span className={styles.text}>Add New Provider</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {options.length === 0 ? (
            <div className={styles.noOptions}>
              No more providers to choose from.
            </div>
          ) : (
            options.map((provider) => (
              <button
                key={provider.name}
                className={styles.dropdownItem}
                onClick={() => choose(provider)}
              >
                {provider.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
