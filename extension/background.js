const HOST_NAME = "com.mocchicc.visionclip";
const MENU_ID = "ocr-image";
const MAX_INLINE_IMAGE_BYTES = 12 * 1024 * 1024;
const recentContextImages = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "この画像をOCRする",
    contexts: ["image"]
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "remember_context_image" || sender.tab?.id == null) {
    return;
  }

  recentContextImages.set(sender.tab.id, {
    imageUrl: message.imageUrl,
    imageDataUrl: message.imageDataUrl,
    capturedAt: Date.now()
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  await setBadge("...", "#4f46e5");

  try {
    const payload = await buildOCRPayload(info, tab);
    const response = await sendNativeMessage(payload);

    if (!response?.ok) {
      throw new Error(response?.error || "OCR failed.");
    }

    await setBadge("OK", "#15803d");
    showToast(tab?.id, "OCR copied", "抽出テキストをクリップボードにコピーしました。", "success");
  } catch (error) {
    await setBadge("ERR", "#b91c1c");
    showToast(tab?.id, "OCR failed", error?.message || String(error), "error");
  } finally {
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3500);
  }
});

async function buildOCRPayload(info, tab) {
  const srcUrl = info.srcUrl || "";
  const remembered = getRecentContextImage(tab?.id, srcUrl);
  const payload = {
    type: "ocr_image",
    imageUrl: remembered?.imageUrl || srcUrl,
    imageDataUrl: remembered?.imageDataUrl,
    pageUrl: info.pageUrl,
    tabTitle: tab?.title
  };

  if (!payload.imageDataUrl) {
    payload.imageDataUrl = await tryFetchAsDataUrl(srcUrl);
  }

  return payload;
}

function getRecentContextImage(tabId, srcUrl) {
  if (tabId == null) {
    return null;
  }

  const remembered = recentContextImages.get(tabId);
  if (!remembered || Date.now() - remembered.capturedAt > 30000) {
    return null;
  }

  if (!srcUrl || remembered.imageUrl === srcUrl || remembered.imageDataUrl) {
    return remembered;
  }

  return null;
}

async function tryFetchAsDataUrl(srcUrl) {
  if (!srcUrl) {
    return null;
  }

  if (srcUrl.startsWith("data:image/")) {
    return srcUrl;
  }

  try {
    const response = await fetch(srcUrl, {
      credentials: "include",
      cache: "force-cache"
    });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size > MAX_INLINE_IMAGE_BYTES) {
      return null;
    }

    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function sendNativeMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function showToast(tabId, title, message, level) {
  if (tabId == null) {
    return;
  }

  chrome.tabs.sendMessage(tabId, {
    type: "show_ocr_toast",
    title,
    message,
    level
  }).catch(() => {});
}

async function setBadge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
}
