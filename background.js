// Recreate context menu on extension startup
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "blinkread-selection",
    title: "Speed Read Selection",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "blinkread-selection" && info.selectionText) {
    const encodedText = encodeURIComponent(info.selectionText);
    browser.tabs.create({
      url: `/reader/reader.html?text=${encodedText}`
    });
  }
});

// Add keyboard shortcut listener
browser.commands.onCommand.addListener(async (command) => {
  if (command === "quick-read") {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    // Execute content script to get selected text
    const selection = await browser.tabs.executeScript(activeTab.id, {
      code: "window.getSelection().toString();"
    });

    if (selection[0]) {
      const encodedText = encodeURIComponent(selection[0]);
      browser.tabs.create({
        url: `/reader/reader.html?text=${encodedText}`
      });
    }
  }
});

// Ensure extension handles text properly after the new tab loads
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.includes("reader.html")) {
    const urlParams = new URLSearchParams(new URL(tab.url).search);
    const text = urlParams.get("text");

    if (text) {
      browser.storage.local.get("settings").then((result) => {
        browser.tabs.sendMessage(tabId, {
          type: "setText",
          text: decodeURIComponent(text),
          settings: result.settings || {
            wpm: 300,
            theme: "light",
            highlightColor: "#8b5cf6",
            longWordThreshold: 8,
            longWordDelay: 30
          }
        });
      });
    }
  }
});
