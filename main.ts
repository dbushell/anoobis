#!/usr/bin/env -S deno run --allow-read --allow-net main.ts
import * as cookie from "jsr:@std/http/cookie";
import * as path from "jsr:@std/path";
import { encodeHex } from "jsr:@std/encoding/hex";
import { challengeHash, validateHash } from "./src/pow.ts";
import { handleProxy } from "./src/proxy.ts";
import { bundle } from "./src/bundle.ts";
import type { Config } from "./src/types.ts";

const ANOOBIS_UUID = crypto.randomUUID();

// Challenge page bundle (around ~5 KB compressed)
const ANOOBIS_HTML = await bundle(
  path.join(import.meta.dirname!, "src/bundle"),
);

const config: Config = JSON.parse(
  await Deno.readTextFile(
    new URL(import.meta.resolve("./anoobis.json")),
  ),
);

// Launch example website
Deno.serve({
  hostname: "localhost",
  port: 8765,
}, () => {
  return new Response("Hello, Sekhet-Aaru!");
});

// Launch reverse proxy
Deno.serve({
  hostname: config.hostname,
  port: config.port,
}, async (request, info) => {
  const url = new URL(request.url);

  // Ignore unconfigured hosts
  if (!(url.host in config.reverse_proxy)) {
    return new Response(null, { status: 404 });
  }

  const challenge: Uint8Array = await challengeHash(
    request,
    info,
    config.difficulty,
    ANOOBIS_UUID,
  );

  if (bypass(request)) {
    return handleProxy(config, request, info);
  }

  if (request.method === "GET" && url.pathname === "/.anoobis") {
    return handleSolve(config, request, challenge);
  }
  const cookies = cookie.getCookies(request.headers);
  if ("anoobis-auth" in cookies) {
    const nonce = Number.parseInt(cookies["anoobis-auth"]);
    const valid = await validateHash(challenge, config.difficulty, nonce);
    if (valid) {
      return handleProxy(config, request, info);
    }
  }
  return handleChallenge(config, request, challenge);
});

/**
 * Allow specific requests without challenge
 */
const bypass = (request: Request): boolean => {
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
const handleSolve = async (
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
const handleChallenge = (
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
