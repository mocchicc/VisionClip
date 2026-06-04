(() => {
if (globalThis.__visionclipContextMenuHandler) {
  document.removeEventListener("contextmenu", globalThis.__visionclipContextMenuHandler, true);
}

if (globalThis.__visionclipMessageHandler) {
  try {
    chrome.runtime.onMessage.removeListener(globalThis.__visionclipMessageHandler);
  } catch {
    // The previous listener may belong to an invalidated extension context.
  }
}

const onContextMenu = async (event) => {
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
};

document.addEventListener("contextmenu", onContextMenu, true);
globalThis.__visionclipContextMenuHandler = onContextMenu;

try {
  const onRuntimeMessage = (message, _sender, sendResponse) => {
    if (message?.type === "show_ocr_toast") {
      showOCRToast(message.title, message.message, message.level);
      return;
    }

    if (message?.type === "start_region_selection") {
      startRegionSelection(message.screenshotDataUrl)
        .then(sendResponse)
        .catch((error) => sendResponse({
          ok: false,
          error: error?.message || String(error)
        }));
      return true;
    }

    if (message?.type === "capture_image_by_url") {
      captureImageByUrl(message.imageUrl)
        .then(sendResponse)
        .catch((error) => sendResponse({
          ok: false,
          error: error?.message || String(error)
        }));
      return true;
    }
  };

  chrome.runtime.onMessage.addListener(onRuntimeMessage);
  globalThis.__visionclipMessageHandler = onRuntimeMessage;
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

async function captureImageByUrl(imageUrl) {
  const image = findImageByUrl(imageUrl);
  if (!image) {
    return { ok: false, imageDataUrl: null };
  }

  return {
    ok: true,
    imageUrl: image.currentSrc || image.src || imageUrl,
    imageDataUrl: await tryCanvasCapture(image)
  };
}

function findImageByUrl(imageUrl) {
  const normalizedTarget = normalizeImageUrl(imageUrl);
  for (const image of document.images) {
    const candidates = [
      image.currentSrc,
      image.src,
      image.getAttribute("src")
    ].map(normalizeImageUrl);

    if (candidates.includes(normalizedTarget)) {
      return image;
    }
  }

  return null;
}

function normalizeImageUrl(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, document.baseURI).href;
  } catch {
    return value;
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


async function startRegionSelection(screenshotDataUrl) {
  const screenshotImage = await loadImage(screenshotDataUrl);

  return new Promise((resolve, reject) => {
    cleanupRegionOverlay();

    const overlay = document.createElement("div");
    overlay.id = "visionclip-region-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2147483646";
    overlay.style.cursor = "crosshair";
    overlay.style.background = "#0f172a";
    overlay.style.userSelect = "none";

    const screenshot = createScreenshotCanvas(screenshotImage);
    screenshot.style.position = "fixed";
    screenshot.style.inset = "0";
    screenshot.style.width = "100vw";
    screenshot.style.height = "100vh";
    screenshot.style.pointerEvents = "none";
    screenshot.style.userSelect = "none";

    const hint = document.createElement("div");
    hint.textContent = "OCRしたい範囲をドラッグ / Escでキャンセル";
    hint.style.position = "fixed";
    hint.style.left = "50%";
    hint.style.top = "18px";
    hint.style.transform = "translateX(-50%)";
    hint.style.padding = "8px 12px";
    hint.style.borderRadius = "8px";
    hint.style.background = "rgba(15, 23, 42, 0.92)";
    hint.style.color = "#ffffff";
    hint.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    hint.style.fontSize = "13px";
    hint.style.lineHeight = "1.4";
    hint.style.pointerEvents = "none";

    const selection = document.createElement("div");
    selection.style.position = "fixed";
    selection.style.display = "none";
    selection.style.border = "2px solid #22c55e";
    selection.style.background = "rgba(34, 197, 94, 0.16)";
    selection.style.boxShadow = "0 0 0 9999px rgba(15, 23, 42, 0.28)";
    selection.style.pointerEvents = "none";

    overlay.append(screenshot, hint, selection);
    document.documentElement.appendChild(overlay);

    let startX = 0;
    let startY = 0;
    let currentRect = null;
    let dragging = false;

    const finish = (result) => {
      document.removeEventListener("keydown", onKeyDown, true);
      suppressFollowUpPageEvents();
      overlay.remove();
      resolve(result);
    };

    const cancel = () => {
      sendRuntimeMessageSafely({
        type: "region_ocr_cancelled",
        pageUrl: window.location.href
      });
      finish({ ok: false, cancelled: true });
    };

    const fail = (error) => {
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      reject(error);
    };

    const updateSelection = (event) => {
      const x = clamp(event.clientX, 0, window.innerWidth);
      const y = clamp(event.clientY, 0, window.innerHeight);
      const left = Math.min(startX, x);
      const top = Math.min(startY, y);
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);
      currentRect = { x: left, y: top, width, height };

      selection.style.display = "block";
      selection.style.left = left + "px";
      selection.style.top = top + "px";
      selection.style.width = width + "px";
      selection.style.height = height + "px";
    };

    const onPointerDown = (event) => {
      suppressPageEvent(event);
      if (event.button !== 0) {
        return;
      }
      dragging = true;
      startX = clamp(event.clientX, 0, window.innerWidth);
      startY = clamp(event.clientY, 0, window.innerHeight);
      updateSelection(event);
      overlay.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      suppressPageEvent(event);
      if (!dragging) {
        return;
      }
      updateSelection(event);
    };

    const onPointerUp = async (event) => {
      suppressPageEvent(event);
      if (!dragging) {
        return;
      }
      dragging = false;
      updateSelection(event);
      overlay.releasePointerCapture?.(event.pointerId);

      if (!currentRect || currentRect.width < 8 || currentRect.height < 8) {
        cancel();
        return;
      }

      try {
        const imageDataUrl = cropScreenshotImage(screenshotImage, currentRect);
        sendRuntimeMessageSafely({
          type: "region_ocr_selected",
          imageDataUrl,
          pageUrl: window.location.href,
          selection: currentRect
        });
        finish({ ok: true });
      } catch (error) {
        fail(error);
      }
    };

    const onPointerCancel = (event) => {
      suppressPageEvent(event);
      cancel();
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }
      suppressPageEvent(event);
      cancel();
    };

    overlay.addEventListener("pointerdown", onPointerDown, true);
    overlay.addEventListener("pointermove", onPointerMove, true);
    overlay.addEventListener("pointerup", onPointerUp, true);
    overlay.addEventListener("pointercancel", onPointerCancel, true);
    for (const eventType of [
      "mousedown",
      "mouseup",
      "click",
      "auxclick",
      "dblclick",
      "contextmenu",
      "touchstart",
      "touchmove",
      "touchend",
      "wheel"
    ]) {
      overlay.addEventListener(eventType, suppressPageEvent, { capture: true, passive: false });
    }
    document.addEventListener("keydown", onKeyDown, true);
  });
}

function createScreenshotCanvas(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("スクリーンショットを表示できませんでした。");
  }

  context.drawImage(image, 0, 0);
  return canvas;
}

function suppressPageEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function suppressFollowUpPageEvents() {
  const targets = [window, document, document.documentElement];
  const eventTypes = ["click", "auxclick", "dblclick", "mousedown", "mouseup"];

  for (const target of targets) {
    for (const eventType of eventTypes) {
      target.addEventListener(eventType, suppressPageEvent, { capture: true, passive: false });
    }
  }

  setTimeout(() => {
    for (const target of targets) {
      for (const eventType of eventTypes) {
        target.removeEventListener(eventType, suppressPageEvent, true);
      }
    }
  }, 500);
}

function cleanupRegionOverlay() {
  document.getElementById("visionclip-region-overlay")?.remove();
}

function cropScreenshotImage(image, rect) {
  const scaleX = image.naturalWidth / window.innerWidth;
  const scaleY = image.naturalHeight / window.innerHeight;
  const sourceX = Math.round(rect.x * scaleX);
  const sourceY = Math.round(rect.y * scaleY);
  const sourceWidth = Math.max(1, Math.round(rect.width * scaleX));
  const sourceHeight = Math.max(1, Math.round(rect.height * scaleY));

  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("選択範囲を切り抜けませんでした。");
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );

  return canvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("スクリーンショットを読み込めませんでした。"));
    image.src = src;
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
})();
