#!/usr/bin/env -S deno run --allow-read --allow-net
import * as cookie from "jsr:@std/http/cookie";
import { challengeHash, validateHash } from "./src/pow.ts";
import { handleProxy } from "./src/proxy.ts";
import type { Config } from "./src/types.ts";
import { bypass, handleChallenge, handleSolve } from "./src/handle.ts";

const ANOOBIS_UUID = crypto.randomUUID();

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

  if (bypass(request)) {
    return handleProxy(config, request, info);
  }

  const challenge: Uint8Array = await challengeHash(
    request,
    info,
    config.difficulty,
    ANOOBIS_UUID,
  );

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
