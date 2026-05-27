const HOST_NAMES = ["com.mocchicc.visionclip", "com.mocchicc.image_ocr"];
const MENU_ID = "ocr-image";
const MAX_INLINE_IMAGE_BYTES = 12 * 1024 * 1024;
const HISTORY_LIMIT = 5;
const recentContextImages = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "この画像をOCRする",
    contexts: ["image"]
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "remember_context_image" && sender.tab?.id != null) {
    recentContextImages.set(sender.tab.id, {
      imageUrl: message.imageUrl,
      imageDataUrl: message.imageDataUrl,
      capturedAt: Date.now()
    });
    return;
  }

  if (message?.type === "get_dashboard") {
    getDashboard()
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        error: error?.message || String(error)
      }));
    return true;
  }

  if (message?.type === "start_region_ocr") {
    startRegionOCR()
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        error: error?.message || String(error)
      }));
    return true;
  }

  if (message?.type === "region_ocr_selected") {
    processRegionSelection(message, sender)
      .then(sendResponse)
      .catch((error) => sendResponse({
        ok: false,
        error: error?.message || String(error)
      }));
    return true;
  }

  if (message?.type === "region_ocr_cancelled") {
    saveCurrentStatus({
      state: "cancelled",
      title: "範囲OCRキャンセル",
      message: "範囲選択をキャンセルしました。",
      updatedAt: Date.now()
    })
      .then(() => chrome.action.setBadgeText({ text: "" }))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({
        ok: false,
        error: error?.message || String(error)
      }));
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  const startedAt = Date.now();
  await setBadge("...", "#4f46e5");
  await saveCurrentStatus({
    state: "running",
    title: "OCR処理中",
    message: tab?.title || info.pageUrl || "画像を読み取っています。",
    startedAt,
    updatedAt: startedAt
  });

  try {
    const payload = await buildOCRPayload(info, tab);
    const response = await sendNativeMessage(payload);

    if (!response?.ok) {
      throw new Error(response?.error || "OCR failed.");
    }

    const finishedAt = Date.now();
    await setBadge("OK", "#15803d");
    await saveCurrentStatus({
      state: "success",
      title: "OCR成功",
      message: "抽出テキストをクリップボードにコピーしました。",
      updatedAt: finishedAt
    });
    await addHistory({
      state: "success",
      title: tab?.title || "画像OCR",
      message: response.textPreview || "抽出テキストをコピーしました。",
      imageUrl: payload.imageUrl,
      pageUrl: info.pageUrl,
      model: response.model,
      copied: response.copied === true,
      createdAt: finishedAt
    });
    showToast(tab?.id, "OCR copied", "抽出テキストをクリップボードにコピーしました。", "success");
  } catch (error) {
    const finishedAt = Date.now();
    const message = error?.message || String(error);
    await setBadge("ERR", "#b91c1c");
    await saveCurrentStatus({
      state: "error",
      title: "OCR失敗",
      message,
      updatedAt: finishedAt
    });
    await addHistory({
      state: "error",
      title: tab?.title || "画像OCR",
      message,
      imageUrl: info.srcUrl,
      pageUrl: info.pageUrl,
      createdAt: finishedAt
    });
    showToast(tab?.id, "OCR failed", message, "error");
  } finally {
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3500);
  }
});

async function startRegionOCR() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.windowId == null) {
    throw new Error("OCRするタブを見つけられませんでした。");
  }

  const startedAt = Date.now();
  await setBadge("SEL", "#4f46e5");
  await saveCurrentStatus({
    state: "running",
    title: "範囲選択中",
    message: "ページ上でOCRしたい範囲をドラッグしてください。",
    startedAt,
    updatedAt: startedAt
  });

  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: "png"
  });

  chrome.tabs.sendMessage(tab.id, {
    type: "start_region_selection",
    screenshotDataUrl
  }).catch(async (error) => {
    await setBadge("ERR", "#b91c1c");
    await saveCurrentStatus({
      state: "error",
      title: "範囲OCR開始失敗",
      message: error?.message || String(error),
      updatedAt: Date.now()
    });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3500);
  });

  return { ok: true };
}

async function processRegionSelection(message, sender) {
  const tab = sender.tab || {};
  const startedAt = Date.now();
  await setBadge("...", "#4f46e5");
  await saveCurrentStatus({
    state: "running",
    title: "範囲OCR処理中",
    message: tab.title || message.pageUrl || "選択範囲を読み取っています。",
    startedAt,
    updatedAt: startedAt
  });

  try {
    const response = await sendNativeMessage({
      type: "ocr_image",
      imageDataUrl: message.imageDataUrl,
      pageUrl: message.pageUrl || tab.url,
      tabTitle: tab.title
    });

    if (!response?.ok) {
      throw new Error(response?.error || "OCR failed.");
    }

    const finishedAt = Date.now();
    await setBadge("OK", "#15803d");
    await saveCurrentStatus({
      state: "success",
      title: "範囲OCR成功",
      message: "選択範囲の抽出テキストをクリップボードにコピーしました。",
      updatedAt: finishedAt
    });
    await addHistory({
      state: "success",
      title: `${tab.title || "範囲OCR"}（範囲）`,
      message: response.textPreview || "抽出テキストをコピーしました。",
      imageUrl: null,
      pageUrl: message.pageUrl || tab.url,
      model: response.model,
      copied: response.copied === true,
      createdAt: finishedAt
    });
    showToast(tab.id, "Region OCR copied", "選択範囲の抽出テキストをクリップボードにコピーしました。", "success");
    return { ok: true };
  } catch (error) {
    const finishedAt = Date.now();
    const errorMessage = error?.message || String(error);
    await setBadge("ERR", "#b91c1c");
    await saveCurrentStatus({
      state: "error",
      title: "範囲OCR失敗",
      message: errorMessage,
      updatedAt: finishedAt
    });
    await addHistory({
      state: "error",
      title: `${tab.title || "範囲OCR"}（範囲）`,
      message: errorMessage,
      imageUrl: null,
      pageUrl: message.pageUrl || tab.url,
      createdAt: finishedAt
    });
    showToast(tab.id, "Region OCR failed", errorMessage, "error");
    throw error;
  } finally {
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3500);
  }
}

async function getDashboard() {
  const [nativeStatus, stored] = await Promise.all([
    getNativeStatus(),
    chrome.storage.local.get(["currentStatus", "history"])
  ]);

  return {
    ok: true,
    nativeStatus,
    currentStatus: stored.currentStatus || null,
    history: stored.history || []
  };
}

async function getNativeStatus() {
  try {
    const response = await sendNativeMessage({ type: "status" });
    return response || { ok: false, error: "No response from native host." };
  } catch (error) {
    return {
      ok: false,
      keyIsSet: false,
      error: error?.message || String(error)
    };
  }
}

async function saveCurrentStatus(status) {
  await chrome.storage.local.set({ currentStatus: status });
}

async function addHistory(item) {
  const { history = [] } = await chrome.storage.local.get("history");
  await chrome.storage.local.set({
    history: [item, ...history].slice(0, HISTORY_LIMIT)
  });
}

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

async function sendNativeMessage(payload) {
  let lastError = null;
  for (const hostName of HOST_NAMES) {
    try {
      return await sendNativeMessageToHost(hostName, payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Native messaging host is not available.");
}

function sendNativeMessageToHost(hostName, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(hostName, payload, (response) => {
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
