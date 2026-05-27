document.addEventListener(
  "contextmenu",
  async (event) => {
    const image = event.target?.closest?.("img");
    if (!image) {
      return;
    }

    const imageUrl = image.currentSrc || image.src;
    const imageDataUrl = await tryCanvasCapture(image);

    sendRuntimeMessageSafely({
      type: "remember_context_image",
      imageUrl,
      imageDataUrl
    });
  },
  true
);

try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "show_ocr_toast") {
      return;
    }

    showOCRToast(message.title, message.message, message.level);
  });
} catch {
  // The old content script can outlive an extension reload on the current page.
}

function sendRuntimeMessageSafely(message) {
  try {
    if (!chrome?.runtime?.id) {
      return;
    }

    chrome.runtime.sendMessage(message).catch(() => {});
  } catch {
    // Ignore stale content scripts after the extension is reloaded.
  }
}

async function tryCanvasCapture(image) {
  const src = image.currentSrc || image.src || "";
  if (!src.startsWith("blob:") && !src.startsWith("data:")) {
    return null;
  }

  try {
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
      await image.decode();
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");
    if (!context || canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function showOCRToast(title, message, level) {
  const existing = document.getElementById("image-ocr-to-clipboard-toast");
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.id = "image-ocr-to-clipboard-toast";
  toast.style.position = "fixed";
  toast.style.zIndex = "2147483647";
  toast.style.right = "18px";
  toast.style.bottom = "18px";
  toast.style.maxWidth = "360px";
  toast.style.padding = "12px 14px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 12px 32px rgba(15, 23, 42, 0.22)";
  toast.style.background = level === "error" ? "#7f1d1d" : "#064e3b";
  toast.style.color = "#ffffff";
  toast.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  toast.style.fontSize = "13px";
  toast.style.lineHeight = "1.45";
  toast.style.whiteSpace = "pre-wrap";

  const heading = document.createElement("div");
  heading.textContent = title;
  heading.style.fontWeight = "700";
  heading.style.marginBottom = "4px";

  const body = document.createElement("div");
  body.textContent = message;

  toast.append(heading, body);
  document.documentElement.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, level === "error" ? 6000 : 3200);
}
