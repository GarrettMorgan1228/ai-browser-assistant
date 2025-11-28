import React from "react";

// A simple button to log current settings for debugging
export default function DebugSettingsButton() {
  const handleClick = () => {
    chrome.storage.local.get(
      ["apiKeys", "baseModel", "temperature", "topP", "modelsByProvider"],
      // log current settings to console
      (res) => {
        console.log("api keys:", res.apiKeys);
        console.log("selected model:", res.baseModel);
        console.log("temperature:", res.temperature);
        console.log("topP:", res.topP);
        console.log("models by provider:", res.modelsByProvider);

        // Example of accessing API key for the selected model's provider
        const { apiKeys = {}, baseModel } = res;
        if (baseModel) {
          const provider = baseModel.split(" > ")[0];
          const key = apiKeys[provider];
          console.log("API key for selected model:", key);
        } else {
          console.log("No base model selected");
        }
      }
    );
  };

  return (
    <button type="button" onClick={handleClick}>
      Debug Settings
    </button>
  );
}
