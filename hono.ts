#!/usr/bin/env -S deno run --allow-read --allow-net
import { Hono } from "jsr:@hono/hono";
import { middleware } from "./src/hono.ts";
import type { Honoobis } from "./src/types.ts";

const hostname = "localhost";
const port = 8000;

const app = new Hono<Honoobis>();

app.use(middleware({
  hostname,
  port,
  difficulty: 20,
  // Not available in Hono use
  reverse_proxy: {},
}));

app.get("/", (context) => {
  return context.text("Hello, Sekhet-Aaru!");
});

Deno.serve({ hostname, port }, (request, info) => {
  return app.fetch(request, { info });
});
