import { MiddlewareHandler } from "jsr:@hono/hono";
import { getCookie } from "jsr:@hono/hono/cookie";
import { challengeHash, validateHash } from "./pow.ts";
import { bypass, handleChallenge, handleSolve } from "./handle.ts";
import type { Config } from "./types.ts";

/**
 * Hono middleware
 */
export const middleware = (config: Config): MiddlewareHandler => {
  const ANOOBIS_UUID = crypto.randomUUID();

  return async (ctx, next) => {
    if (bypass(ctx.req.raw)) {
      return next();
    }

    const url = new URL(ctx.req.url);

    const challenge: Uint8Array = await challengeHash(
      ctx.req.raw,
      ctx.env.info,
      config.difficulty,
      ANOOBIS_UUID,
    );

    if (ctx.req.method === "GET" && url.pathname === "/.anoobis") {
      return handleSolve(config, ctx.req.raw, challenge);
    }
    const cookie = getCookie(ctx, "anoobis-auth");
    if (cookie) {
      const nonce = Number.parseInt(cookie);
      const valid = await validateHash(challenge, config.difficulty, nonce);
      if (valid) {
        return next();
      }
    }
    return handleChallenge(config, ctx.req.raw, challenge);
  };
};
