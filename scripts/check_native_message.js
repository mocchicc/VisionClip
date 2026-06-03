const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8"));
const hostPath = process.argv[2];

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});

async function main() {
  if (!hostPath) {
    throw new Error("Usage: node scripts/check_native_message.js <path-to-image-ocr-host>");
  }

  if (!fs.statSync(hostPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Native host binary does not exist: ${hostPath}`);
  }

  const response = await sendNativeMessage(hostPath, {
    type: "status",
    checkKeychain: false
  });

  if (response.ok !== true) {
    throw new Error(`Expected ok=true status response, got ${JSON.stringify(response)}`);
  }

  if (response.version !== manifest.version) {
    throw new Error(`Expected native response version ${manifest.version}, got ${response.version}`);
  }

  if (response.model !== "gpt-5.4-nano") {
    throw new Error(`Expected default model gpt-5.4-nano, got ${response.model}`);
  }

  if (typeof response.keyIsSet !== "boolean") {
    throw new Error(`Expected boolean keyIsSet in status response, got ${JSON.stringify(response)}`);
  }
}

async function sendNativeMessage(binaryPath, payload) {
  const child = spawn(binaryPath, [], {
    stdio: ["pipe", "pipe", "pipe"]
  });

  const stdoutChunks = [];
  const stderrChunks = [];
  child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
  child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

  const closePromise = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });

  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
  }, 5000);

  const message = Buffer.from(JSON.stringify(payload));
  const length = Buffer.alloc(4);
  length.writeUInt32LE(message.length, 0);
  child.stdin.end(Buffer.concat([length, message]));

  const result = await closePromise;
  clearTimeout(timeout);

  const stdout = Buffer.concat(stdoutChunks);
  const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
  if (result.code !== 0) {
    throw new Error(`Native host exited with code ${result.code} signal ${result.signal || "none"}${stderr ? `: ${stderr}` : ""}`);
  }

  if (stdout.length < 4) {
    throw new Error(`Native host returned ${stdout.length} bytes, expected length-prefixed JSON${stderr ? `: ${stderr}` : ""}`);
  }

  const responseLength = stdout.readUInt32LE(0);
  const responseEnd = 4 + responseLength;
  if (stdout.length < responseEnd) {
    throw new Error(`Native host response is truncated: expected ${responseEnd} bytes, got ${stdout.length}`);
  }

  const trailingBytes = stdout.length - responseEnd;
  if (trailingBytes !== 0) {
    throw new Error(`Native host wrote ${trailingBytes} unexpected trailing bytes`);
  }

  return JSON.parse(stdout.subarray(4, responseEnd).toString("utf8"));
}
