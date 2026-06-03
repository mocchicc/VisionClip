const HOST_NAMES = ["com.mocchicc.visionclip", "com.mocchicc.image_ocr"];
const MODEL_STORAGE_KEY = "ocrModel";
const HISTORY_ENABLED_STORAGE_KEY = "historyEnabled";
const DEFAULT_MODEL = "gpt-5.4-nano";
const input = document.getElementById("api-key");
const modelSelect = document.getElementById("model");
const historyEnabledInput = document.getElementById("history-enabled");
const saveButton = document.getElementById("save");
const saveModelButton = document.getElementById("save-model");
const checkButton = document.getElementById("check");
const toggleButton = document.getElementById("toggle");
const message = document.getElementById("message");
const modelMessage = document.getElementById("model-message");
const privacyMessage = document.getElementById("privacy-message");

saveButton.addEventListener("click", saveAPIKey);
saveModelButton.addEventListener("click", saveModel);
checkButton.addEventListener("click", checkStatus);
toggleButton.addEventListener("click", toggleVisibility);
historyEnabledInput.addEventListener("change", saveHistoryPreference);
document.addEventListener("DOMContentLoaded", initOptions);

async function initOptions() {
  await Promise.all([
    loadModel(),
    loadHistoryPreference(),
    checkStatus()
  ]);
}

async function loadModel() {
  const stored = await chrome.storage.local.get(MODEL_STORAGE_KEY);
  modelSelect.value = stored[MODEL_STORAGE_KEY] || DEFAULT_MODEL;
}

async function saveModel() {
  const model = modelSelect.value || DEFAULT_MODEL;
  await chrome.storage.local.set({ [MODEL_STORAGE_KEY]: model });
  showModelMessage(`${model} を保存しました。`, "ok");
}

async function loadHistoryPreference() {
  const stored = await chrome.storage.local.get(HISTORY_ENABLED_STORAGE_KEY);
  historyEnabledInput.checked = stored[HISTORY_ENABLED_STORAGE_KEY] !== false;
}

async function saveHistoryPreference() {
  const enabled = historyEnabledInput.checked;
  privacyMessage.textContent = "保存中...";
  privacyMessage.className = "message";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "set_history_enabled",
      enabled
    });
    if (!response?.ok) {
      throw new Error(response?.error || "履歴設定を保存できませんでした。");
    }

    showPrivacyMessage(enabled ? "OCR履歴を保存します。" : "OCR履歴の新規保存を停止しました。", "ok");
  } catch (error) {
    historyEnabledInput.checked = !enabled;
    showPrivacyMessage(error?.message || String(error), "bad");
  }
}

async function saveAPIKey() {
  const apiKey = input.value.trim();
  if (!apiKey) {
    showMessage("APIキーを入力してください。", "bad");
    return;
  }

  showMessage("保存中...", "");
  try {
    const response = await sendNativeMessage({ type: "set_api_key", apiKey });
    if (!response?.ok) {
      throw new Error(response?.error || "APIキーを保存できませんでした。");
    }

    input.value = "";
    showMessage("APIキーをKeychainに保存しました。", "ok");
  } catch (error) {
    showMessage(error?.message || String(error), "bad");
  }
}

async function checkStatus() {
  showMessage("確認中...", "");
  try {
    const response = await sendNativeMessage({ type: "status" });
    if (!response?.ok) {
      throw new Error(response?.error || "状態を確認できませんでした。");
    }

    showMessage(response.keyIsSet ? "APIキーはセット済みです。" : "APIキーはまだセットされていません。", response.keyIsSet ? "ok" : "bad");
  } catch (error) {
    showMessage(error?.message || String(error), "bad");
  }
}

function toggleVisibility() {
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  toggleButton.textContent = visible ? "表示" : "隠す";
}

function showMessage(text, className) {
  message.textContent = text;
  message.className = "message " + className;
}

function showModelMessage(text, className) {
  modelMessage.textContent = text;
  modelMessage.className = "message " + className;
}

function showPrivacyMessage(text, className) {
  privacyMessage.textContent = text;
  privacyMessage.className = "message " + className;
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
