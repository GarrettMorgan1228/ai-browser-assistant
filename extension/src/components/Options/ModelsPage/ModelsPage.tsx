import styles from './ModelsPage.module.css';
import { useState, useEffect } from "react";
import { Provider } from '../ProviderSelector/ProviderSelector';
import { ALL_PROVIDERS, GEMINI } from '../../../llm/providers';
import TagsInput from '../TaggedInput/TaggedInput';
import ProviderSelector from '../ProviderSelector/ProviderSelector';
import ModelSelector from '../ModelSelector/ModelSelector';
import SliderWithInput from '../SliderWithInput/SliderWithInput';
import DebugSettingsButton from '../DebugButton/DebugButton'; // Temporary debug button

const providerCatalog = GEMINI;

// Main ModelsPage component
export default function ModelsPage() {
  const [selected, setSelected] = useState<string[]>([]); // track selected provider names
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, string[]>>( //  track models per provider
    () => Object.fromEntries(providerCatalog.map(p => [p.name, p.models ?? []])) // default to all models
  );
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({}); // track API keys per provider
  const [savedSelected, setSavedSelected] = useState<string[]>([]); // track saved state to avoid unnecessary writes

  // Load saved settings on mount
  useEffect(() => {
    chrome.storage.local.get(["selected","modelsByProvider","apiKeys"], (res) => {
      if (res.selected) {
        setSelected(res.selected);
        setSavedSelected(res.selected); // mark loaded ones as saved
      }
      if (res.modelsByProvider) setModelsByProvider(res.modelsByProvider);
      if (res.apiKeys) setApiKeys(res.apiKeys);
    });
  }, []);

  // Handle saving changes to a provider's models and API key
  function handleSave(name: string, nextModels: string[], nextKey: string) {
    const nextModelsBy = { ...modelsByProvider, [name]: nextModels };
    const nextKeys = { ...apiKeys, [name]: nextKey };

    setModelsByProvider(nextModelsBy);
    setApiKeys(nextKeys);

    chrome.storage.local.set({
      selected,
      modelsByProvider: nextModelsBy,
      apiKeys: nextKeys
    });

    setSavedSelected(prev => prev.includes(name) ? prev : [...prev, name]); // mark saved
  }

  // Handle adding a provider
  function handleAdd(provider: Provider) {
    setSelected(prev => prev.includes(provider.name) ? prev : [...prev, provider.name]);
    setModelsByProvider(prev => ({ ...prev, [provider.name]: prev[provider.name] ?? (provider.models ?? []) }));
  }

  // Handle removing a provider
  function handleRemove(name: string) {
    // remove from selected, models, and keys
    const nextSelected = selected.filter(n => n !== name);
    const { [name]: _m, ...nextModels } = modelsByProvider;
    const { [name]: _k, ...nextKeys } = apiKeys;

    // update state and storage
    setSelected(nextSelected);
    setModelsByProvider(nextModels);
    setApiKeys(nextKeys);
    setSavedSelected(prev => prev.filter(n => n !== name)); // drop from saved

    // update storage
    chrome.storage.local.set({
      selected: nextSelected,
      modelsByProvider: nextModels,
      apiKeys: nextKeys,
    });

    // also clear base model if it points to this provider
    chrome.storage.local.get(["baseModel"], res => {
      if (res.baseModel && res.baseModel.startsWith(name)) {
        chrome.storage.local.remove("baseModel");
      }
    });
  }

  // Filter available and chosen providers (ordered)
  const available = providerCatalog.filter(p => !selected.includes(p.name));

  // Get full provider details for selected names (unordered)
  const chosen = selected.map(n => providerCatalog.find(p => p.name === n)!).filter(Boolean);

  // Conditional rendering based on whether providers are selected
  const IsSelected = chosen.length > 0 ? (
  <SelectedProviders  // Component to display selected providers
    items={chosen} 
    onRemove={handleRemove} 
    modelsByProvider={modelsByProvider} 
    setModelsByProvider={setModelsByProvider} 
    handleSave={handleSave}
    apiKeys={apiKeys}
  /> 
  ) : (<div className={styles["not-configured"]}>No providers configured yet. Add a provider to get started.</div>);

  // Render main component
  return (
    <>
    <div className={styles['models-container']}> 
      <h2 className={styles['title']}>LLM Providers</h2>
      {IsSelected} {/* Display selected providers or message*/}
      <ProviderSelector options={available} onSelect={handleAdd} />
    </div>

    <div className={styles['models-settings-container']}>  
      <h2 className={styles['title']}>Model Selection</h2>
      <ModelSettings modelsByProvider={modelsByProvider} selected={savedSelected} />
    </div>
    </>
  );
}

// ModelCard component to display individual provider details
function ModelCard({
  LLM,
  onRemove,
  value,
  apiKeyValue,
  onSave,
}: {
  LLM: Provider;
  onRemove: () => void;
  value: string[];
  apiKeyValue: string;
  onSave: (models: string[], apiKey: string) => void;
}) {
  const [draftModels, setDraftModels] = useState<string[]>(value);
  const [draftKey, setDraftKey] = useState<string>(apiKeyValue);

  // reset drafts when props change (e.g., after save or external load)
  useEffect(() => setDraftModels(value), [value]);
  useEffect(() => setDraftKey(apiKeyValue), [apiKeyValue]);

  // Determine if there are unsaved changes
  const changed =
    draftKey !== apiKeyValue ||
    draftModels.length !== value.length ||
    draftModels.some((m, i) => m !== value[i]);

  // Render the model card UI
  return (
    <div className={styles["model-card"]}>
      <div className={styles["models-item"]}>
        <h2>{LLM.name}</h2>
        <div>
          <button className={styles.save} disabled={!changed} onClick={() => onSave(draftModels, draftKey)}>Save</button>
          <button
            className={styles.delete}
            onClick={() => {
              setDraftModels(value);
              setDraftKey(apiKeyValue);
              onRemove(); // if Cancel should also remove card; if not, drop this call.
            }}
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className={styles["api-key-details"]}>
        <h3>API Key</h3>
        <input
          type="password"
          placeholder={`Enter ${LLM.name} API Key (required)`}
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
        />
      </div>

      <div className={styles["models"]}>
        <h3>Models</h3>
        <div className={styles["models-list"]}>
          <TagsInput value={draftModels} onChange={setDraftModels} />
        </div>
      </div>
    </div>
  );
}

// Component to display list of selected providers with their model cards
function SelectedProviders({ 
  items, 
  onRemove, 
  modelsByProvider, 
  setModelsByProvider,
  handleSave,
  apiKeys
}: { 
  items: Provider[]; 
  onRemove: (id: string) => void; 
  modelsByProvider: Record<string, string[]>;
  setModelsByProvider: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  handleSave: (name: string, models: string[], apiKey: string) => void;
  apiKeys: Record<string, string>;
}) {

  return (
    <div>
      {/* Render a ModelCard for each selected provider */}
      {items.map(provider => (
        <ModelCard
          key={provider.name}
          LLM={provider}
          onRemove={() => onRemove(provider.name)}
          value={modelsByProvider[provider.name] ?? []}
          apiKeyValue={apiKeys?.[provider.name] ?? ""}
          onSave={(models, key) => handleSave(provider.name, models, key)}
        />
      ))}
    </div>
  );
}

// Component for model settings like temperature and topP
function ModelSettings({
  modelsByProvider, 
  selected,
}: { 
  modelsByProvider: Record<string,string[]>; 
  selected: string[] 
}) {

  // Prepare options for ModelSelector based on selected providers
  const options = selected.map(name => ({...providerCatalog.find(p => p.name === name)!,models: modelsByProvider[name] ?? [],}));

  return (
    <>
    <div className={styles["planner"]}>
        <h3>Base Model</h3>
        <p>Choose the base model for general tasks.</p>
        <div className={styles["model-settings"]}>
          <div className={styles["model-settings-item"]}>
             <label>Model</label>
             <div className={styles["model-settings-wrapper"]}>
                <ModelSelector options={options}/> 
             </div>
          </div>

          <div className={styles["model-settings-item"]}>
            <label>Temperature</label>
            <div className={styles["model-settings-wrapper"]}>
              <SliderWithInput Max={2} storageKey="temperature" defaultValue={0.1}/>
            </div>
          </div>

          <div className={styles["model-settings-item"]}>
            <label>Top P</label>
            <div className={styles["model-settings-wrapper"]}>
              <SliderWithInput Max={1} storageKey="topP" defaultValue={0.1}/>
            </div>
          </div>
        </div>
    </div>
    </>
  );
}


