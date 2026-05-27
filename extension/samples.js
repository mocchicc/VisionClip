const regionButton = document.getElementById("region-ocr");
const status = document.getElementById("status");
const result = document.getElementById("result");

regionButton.addEventListener("click", startSampleRegionOCR);
window.addEventListener("hashchange", maybeStartFromHash);
document.addEventListener("DOMContentLoaded", maybeStartFromHash);

function maybeStartFromHash() {
  if (!location.hash.startsWith("#region-ocr")) {
    return;
  }

  history.replaceState(null, "", location.pathname);
  startSampleRegionOCR();
}

function startSampleRegionOCR() {
  regionButton.disabled = true;
  result.hidden = true;
  setStatus("サンプル画像の上でOCRしたい範囲をドラッグしてください。", "");

  startRegionSelection()
    .then(async (selection) => {
      if (selection.error) {
        throw new Error(selection.error);
      }

      if (selection.cancelled) {
        setStatus("範囲選択をキャンセルしました。", "");
        return;
      }

      setStatus("OCR処理中...", "");
      const response = await chrome.runtime.sendMessage({
        type: "ocr_sample_image",
        imageDataUrl: selection.imageDataUrl,
        pageUrl: location.href,
        title: selection.title
      });

      if (!response?.ok) {
        throw new Error(response?.error || "サンプルOCRに失敗しました。");
      }

      setStatus(`抽出テキストをクリップボードにコピーしました。${formatUsage(response.usage)}`, "ok");
      if (response.textPreview) {
        result.textContent = response.textPreview;
        result.hidden = false;
      }
    })
    .catch((error) => {
      setStatus(error?.message || String(error), "bad");
    })
    .finally(() => {
      regionButton.disabled = false;
    });
}

function startRegionSelection() {
  return new Promise((resolve) => {
    cleanupRegionOverlay();

    const overlay = document.createElement("div");
    overlay.className = "region-overlay";

    const hint = document.createElement("div");
    hint.className = "region-hint";
    hint.textContent = "サンプル画像の範囲をドラッグ / Escでキャンセル";

    const selection = document.createElement("div");
    selection.className = "region-selection";

    overlay.append(hint, selection);
    document.documentElement.appendChild(overlay);

    let startX = 0;
    let startY = 0;
    let currentRect = null;
    let dragging = false;

    const finish = (value) => {
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      resolve(value);
    };

    const cancel = () => finish({ cancelled: true });

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
      if (event.button !== 0) {
        return;
      }

      dragging = true;
      startX = clamp(event.clientX, 0, window.innerWidth);
      startY = clamp(event.clientY, 0, window.innerHeight);
      updateSelection(event);
      overlay.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      if (!dragging) {
        return;
      }

      updateSelection(event);
      event.preventDefault();
    };

    const onPointerUp = async (event) => {
      if (!dragging) {
        return;
      }

      dragging = false;
      updateSelection(event);
      overlay.releasePointerCapture?.(event.pointerId);
      event.preventDefault();

      if (!currentRect || currentRect.width < 8 || currentRect.height < 8) {
        cancel();
        return;
      }

      try {
        finish(await cropSelectedSampleImage(currentRect));
      } catch (error) {
        finish({ error: error?.message || String(error) });
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      cancel();
    };

    overlay.addEventListener("pointerdown", onPointerDown, true);
    overlay.addEventListener("pointermove", onPointerMove, true);
    overlay.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown, true);
  });
}

async function cropSelectedSampleImage(rect) {
  const target = findBestImageIntersection(rect);
  if (!target) {
    throw new Error("サンプル画像の上を選択してください。");
  }

  const { image, intersection, imageRect } = target;
  if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
    await image.decode();
  }

  const scaleX = image.naturalWidth / imageRect.width;
  const scaleY = image.naturalHeight / imageRect.height;
  const sourceX = Math.round((intersection.x - imageRect.left) * scaleX);
  const sourceY = Math.round((intersection.y - imageRect.top) * scaleY);
  const sourceWidth = Math.max(1, Math.round(intersection.width * scaleX));
  const sourceHeight = Math.max(1, Math.round(intersection.height * scaleY));

  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("選択範囲を切り出せませんでした。");
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

  return {
    imageDataUrl: canvas.toDataURL("image/png"),
    title: image.dataset.title || image.alt || "OCRサンプル"
  };
}

function findBestImageIntersection(selectionRect) {
  let best = null;

  for (const image of document.querySelectorAll(".sample-grid img")) {
    const imageRect = image.getBoundingClientRect();
    const intersection = intersectRects(selectionRect, imageRect);
    if (!intersection) {
      continue;
    }

    const area = intersection.width * intersection.height;
    if (!best || area > best.area) {
      best = { image, imageRect, intersection, area };
    }
  }

  return best;
}

function intersectRects(a, b) {
  const left = Math.max(a.x, b.left);
  const top = Math.max(a.y, b.top);
  const right = Math.min(a.x + a.width, b.right);
  const bottom = Math.min(a.y + a.height, b.bottom);
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x: left, y: top, width, height };
}

function cleanupRegionOverlay() {
  document.querySelector(".region-overlay")?.remove();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setStatus(text, level) {
  status.textContent = text;
  status.className = "status " + level;
}

function formatUsage(usage) {
  if (!usage?.totalTokens) {
    return "";
  }

  return ` usage: ${usage.totalTokens.toLocaleString()} tokens`;
}
