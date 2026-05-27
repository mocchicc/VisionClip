const HOST_NAMES = ["com.mocchicc.visionclip", "com.mocchicc.image_ocr"];
const input = document.getElementById("api-key");
const saveButton = document.getElementById("save");
const checkButton = document.getElementById("check");
const toggleButton = document.getElementById("toggle");
const message = document.getElementById("message");

saveButton.addEventListener("click", saveAPIKey);
checkButton.addEventListener("click", checkStatus);
toggleButton.addEventListener("click", toggleVisibility);
document.addEventListener("DOMContentLoaded", checkStatus);

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
