const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const socialImages = [
  "assets/social/x-modal-range-ocr.png",
  "assets/social/x-workflow-keychain.png",
  "assets/social/x-product-hero.png",
  "assets/social/x-imagegen-modal-range-ocr.png",
  "assets/social/x-imagegen-workflow-keychain.png",
  "assets/social/x-imagegen-launch-desk.png"
];
const sampleImages = [
  "samples/ocr-sample-01-dashboard.png",
  "samples/ocr-sample-02-receipts-labels.png",
  "samples/ocr-sample-03-whiteboard-notes.png"
];

for (const relativePath of socialImages) {
  const metadata = readPngMetadata(path.join(root, relativePath));
  if (metadata.width < 1200 || metadata.height < 675) {
    throw new Error(`${relativePath} should be at least 1200x675 for X posts`);
  }

  const ratio = metadata.width / metadata.height;
  if (ratio < 1.7 || ratio > 1.82) {
    throw new Error(`${relativePath} should be close to 16:9, got ${metadata.width}x${metadata.height}`);
  }
}

const promotional = readPngMetadata(path.join(root, "assets/store/promotional-small.png"));
if (promotional.width !== 440 || promotional.height !== 280) {
  throw new Error(`assets/store/promotional-small.png must be 440x280, got ${promotional.width}x${promotional.height}`);
}

for (const relativePath of sampleImages) {
  const metadata = readPngMetadata(path.join(root, relativePath));
  if (metadata.width < 1200 || metadata.height < 800) {
    throw new Error(`${relativePath} should be large enough for OCR smoke tests`);
  }
}

const samplePage = "samples/index.html";
const samplePagePath = path.join(root, samplePage);
const sampleHtml = fs.readFileSync(samplePagePath, "utf8");
for (const relativePath of sampleImages) {
  const fileName = path.basename(relativePath);
  if (!sampleHtml.includes(fileName)) {
    throw new Error(`${samplePage} must reference ${fileName}`);
  }
}
for (const match of sampleHtml.matchAll(/(?:src|href|data-open-modal)="([^"]+\.png)"/g)) {
  const referencedPath = path.join(path.dirname(samplePagePath), match[1]);
  if (!fs.existsSync(referencedPath)) {
    throw new Error(`${samplePage} references missing image ${match[1]}`);
  }
}

for (const relativePath of [
  ...socialImages,
  "assets/store/promotional-small.png"
]) {
  if (relativePath.startsWith("extension/")) {
    throw new Error(`${relativePath} must not be stored inside extension/`);
  }
}

function readPngMetadata(filePath) {
  const data = fs.readFileSync(filePath);
  const signature = data.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error(`${filePath} is not a PNG file`);
  }

  const bitDepth = data.readUInt8(24);
  const colorType = data.readUInt8(25);
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`${filePath} must be an 8-bit RGB or RGBA PNG`);
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth,
    colorType
  };
}
