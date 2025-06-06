import * as cookie from "jsr:@std/http/cookie";
import { encodeHex } from "jsr:@std/encoding/hex";
import { validateHash } from "./pow.ts";
import { ANOOBIS_HTML } from "./bundle.ts";
import type { Config } from "./types.ts";

/**
 * Allow specific requests without challenge
 */
export const bypass = (request: Request): boolean => {
  const secFetchMode = request.headers.get("Sec-Fetch-Mode");
  const secFetchDest = request.headers.get("Sec-Fetch-Dest");
  if (secFetchMode === "cors") {
    if (secFetchDest === "manifest") {
      return true;
    }
  }
  return false;
};

/**
 * Validate proof-of-work solution request
 */
export const handleSolve = async (
  config: Config,
  request: Request,
  challenge: Uint8Array,
): Promise<Response> => {
  const url = new URL(request.url);
  const error = new Response(null, { status: 404 });
  const nonce = Number.parseInt(url.searchParams.get("nonce") ?? "0");
  if (nonce <= 0) {
    return error;
  }
  const valid = await validateHash(challenge, config.difficulty, nonce);
  if (valid === false) {
    return error;
  }
  const response = new Response(null, { status: 302 });
  const location = url.searchParams.get("location") ?? "/";
  response.headers.set("location", location);
  cookie.deleteCookie(response.headers, "anoobis-challenge");
  cookie.setCookie(response.headers, {
    name: "anoobis-auth",
    value: String(nonce),
    sameSite: "Lax",
    httpOnly: true,
    expires: new Date().setHours(24, 0, 0, 0),
  });
  return response;
};

/**
 * Respond with proof-of-work challenge page
 */
export const handleChallenge = (
  config: Config,
  request: Request,
  challenge: Uint8Array,
): Response => {
  // Return 404 for non-HTML requests
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) {
    const response = new Response(null, { status: 404 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  // Return challenge page
  const response = new Response(ANOOBIS_HTML);
  response.headers.set("Content-Type", "text/html; charset=utf-8");
  response.headers.set("Cache-Control", "no-store");

  // Append encoded challenge cookie
  cookie.deleteCookie(response.headers, "anoobis-auth");
  cookie.setCookie(response.headers, {
    name: "anoobis-challenge",
    path: "/",
    sameSite: "Lax",
    httpOnly: false,
    expires: new Date().setHours(24, 0, 0, 0),
    value: encodeHex(
      JSON.stringify({
        challenge: encodeHex(challenge),
        difficulty: config.difficulty,
      }),
    ),
  });

  return response;
};
