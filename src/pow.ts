import type { Info } from "./types.ts";

const encoder = new TextEncoder();

/**
 * Generate unique challenge hash
 */
export const challengeHash = async (
  request: Request,
  info: Info,
  difficulty: number,
  uuid = "",
): Promise<Uint8Array> => {
  let str = "";
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  str += date.toISOString();
  str += info.remoteAddr.hostname;
  str += request.headers.get("Accept-Language") ?? "";
  str += request.headers.get("User-Agent") ?? "";
  str += difficulty;
  str += uuid;
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(str)),
  );
};

/**
 * Check valid proof-of-work
 */
export const validateHash = async (
  challenge: Uint8Array,
  difficulty: number,
  nonce: number,
): Promise<boolean> => {
  const buffer = new Uint8Array(32 + 4);
  buffer.set(challenge, 0);
  const view = new DataView(buffer.buffer);
  view.setInt32(32, nonce, true);
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", buffer),
  );
  for (let i = 0; i < difficulty; i++) {
    const byte = hash[Math.floor(i / 8)];
    const bit = i % 8;
    if ((byte & (1 << bit)) !== 0) {
      return false;
    }
  }
  return true;
};
