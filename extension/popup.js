const keyStatus = document.getElementById("key-status");
const runStatus = document.getElementById("run-status");
const statusMessage = document.getElementById("status-message");
const historyRoot = document.getElementById("history");
const refreshButton = document.getElementById("refresh");
const settingsButton = document.getElementById("settings");

refreshButton.addEventListener("click", loadDashboard);
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
  keyStatus.textContent = "確認中...";
  runStatus.textContent = "確認中...";
  statusMessage.textContent = "";

  try {
    const dashboard = await chrome.runtime.sendMessage({ type: "get_dashboard" });
    renderDashboard(dashboard);
  } catch (error) {
    keyStatus.textContent = "確認できません";
    keyStatus.className = "bad";
    runStatus.textContent = "拡張エラー";
    runStatus.className = "bad";
    statusMessage.textContent = error?.message || String(error);
    renderHistory([]);
  }
}

function renderDashboard(dashboard) {
  const nativeStatus = dashboard?.nativeStatus || {};
  const currentStatus = dashboard?.currentStatus;

  if (nativeStatus.ok && nativeStatus.keyIsSet) {
    keyStatus.textContent = "セット済み";
    keyStatus.className = "ok";
  } else if (nativeStatus.ok && nativeStatus.keyIsSet === false) {
    keyStatus.textContent = "未セット";
    keyStatus.className = "warn";
  } else {
    keyStatus.textContent = "確認失敗";
    keyStatus.className = "bad";
  }

  if (currentStatus) {
    runStatus.textContent = labelForState(currentStatus.state);
    runStatus.className = classForState(currentStatus.state);
    statusMessage.textContent = currentStatus.message || "";
  } else {
    runStatus.textContent = "待機中";
    runStatus.className = "";
    statusMessage.textContent = nativeStatus.error || "画像を右クリックしてOCRを実行できます。";
  }

  if (nativeStatus.error && !nativeStatus.keyIsSet) {
    statusMessage.textContent = nativeStatus.error;
  }

  renderHistory(dashboard?.history || []);
}

function renderHistory(history) {
  historyRoot.innerHTML = "";
  if (history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "まだ履歴はありません。";
    historyRoot.appendChild(empty);
    return;
  }

  for (const item of history.slice(0, 5)) {
    const element = document.createElement("article");
    element.className = "item " + (item.state || "");

    const title = document.createElement("div");
    title.className = "item-title";

    const label = document.createElement("span");
    label.textContent = labelForState(item.state) + " - " + (item.title || "画像OCR");

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const time = document.createElement("span");
    time.className = "item-time";
    time.textContent = formatTime(item.createdAt);
    actions.appendChild(time);

    if (item.state === "success" && item.message) {
      const copyButton = document.createElement("button");
      copyButton.className = "copy-button";
      copyButton.type = "button";
      copyButton.textContent = "コピー";
      copyButton.addEventListener("click", async () => {
        await copyHistoryText(item.message, copyButton);
      });
      actions.appendChild(copyButton);
    }

    const message = document.createElement("div");
    message.className = "item-message";
    message.textContent = item.message || "";

    title.append(label, actions);
    element.append(title, message);
    historyRoot.appendChild(element);
  }
}

function labelForState(state) {
  switch (state) {
    case "running": return "処理中";
    case "success": return "成功";
    case "error": return "失敗";
    default: return "待機中";
  }
}

function classForState(state) {
  switch (state) {
    case "success": return "ok";
    case "error": return "bad";
    case "running": return "warn";
    default: return "";
  }
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}


async function copyHistoryText(text, button) {
  const originalLabel = button.textContent;
  try {
    await writeClipboardText(text);
    button.textContent = "済";
    runStatus.textContent = "成功";
    runStatus.className = "ok";
    statusMessage.textContent = "履歴の抽出テキストをクリップボードにコピーしました。";
  } catch (error) {
    button.textContent = "失敗";
    runStatus.textContent = "失敗";
    runStatus.className = "bad";
    statusMessage.textContent = error?.message || String(error);
  } finally {
    setTimeout(() => {
      button.textContent = originalLabel;
    }, 1200);
  }
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("クリップボードにコピーできませんでした。");
  }
}
