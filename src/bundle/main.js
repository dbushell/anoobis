const workerScript = async function () {
  const wasmURL = "";

  const memory = new WebAssembly.Memory({
    initial: (1 * 1024 * 1024) / (64 * 1024),
    maximum: (2 * 1024 * 1024) / (64 * 1024),
  });

  const response = await fetch(wasmURL);
  const bytes = await response.arrayBuffer();
  const wasm = await WebAssembly.instantiate(bytes, {
    env: { memory },
  });

  const exports = wasm.instance.exports;

  exports.init();

  const seed = new Uint8Array(
    memory.buffer,
    exports.getSeed(),
    32,
  );

  const hash = new Uint8Array(
    memory.buffer,
    exports.getHash(),
    32,
  );

  seed.fill(0);
  hash.fill(0);

  self.addEventListener("message", (ev) => {
    if (ev.data.type === "challenge") {
      seed.set(ev.data.seed, 0);
      const nonce = exports.solve(ev.data.difficulty);
      self.postMessage({
        type: "solution",
        nonce,
      });
    }
  });

  self.postMessage({ type: "ready" });
}.toString();

const workerURL = URL.createObjectURL(
  new Blob(["(", workerScript, ")()"], { type: "application/javascript" }),
);

const worker = new Worker(workerURL, { type: "module" });

const cookies = new Map();
for (const kv of document.cookie.split(";")) {
  const [key, ...value] = kv.split("=");
  if (key !== undefined) {
    cookies.set(key.trim(), value.join("="));
  }
}

function hexDecode(str) {
  const buf = new Uint8Array(str.length / 2);
  for (let i = 0; i < str.length; i += 2) {
    buf[i / 2] = Number.parseInt(str.substring(i, i + 2), 16);
  }
  return buf;
}

const { challenge, difficulty } = JSON.parse(
  new TextDecoder().decode(hexDecode(cookies.get("anoobis-challenge"))),
);

worker.addEventListener("message", (ev) => {
  if (ev.data.type === "ready") {
    worker.postMessage({
      type: "challenge",
      seed: hexDecode(challenge),
      difficulty,
    });
  }
  if (ev.data.type === "solution") {
    const url = new URL("/.anoobis", document.location);
    url.searchParams.set("nonce", ev.data.nonce);
    url.searchParams.set("location", document.location.href);
    document.location.href = url.href;
  }
});
