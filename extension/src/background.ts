// Set the side panel to open when the extension action is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

/*
// Optional: Log a message when the background script is loaded
chrome.action.onClicked.addListener(async (tab) => {
  console.log("Extension clicked, opening side panel...");

  // Ensure the side panel opens for the active window
  if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
  } else {
      console.error("Side Panel API not available.");
  }
});
*/