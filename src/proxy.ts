import type { Config, Info } from "./types.ts";

/**
 * Reverse-proxy HTTP requests
 */
export const handleProxy = async (
  config: Config,
  request: Request,
  info: Info,
): Promise<Response> => {
  const url = new URL(request.url);

  if (!(url.host in config.reverse_proxy)) {
    return new Response(null, { status: 404 });
  }

  const { protocol, hostname, port } = config.reverse_proxy[url.host];
  const newURL = new URL(url.pathname, `${protocol}://${hostname}:${port}`);
  newURL.search = url.search;

  if (
    request.method === "GET" &&
    request.headers.get("upgrade") === "websocket"
  ) {
    return handleWebSocket(request, newURL);
  }

  const newRequest = new Request(newURL, request);
  newRequest.headers.set("X-Forwarded-For", info.remoteAddr.hostname);
  newRequest.headers.set("X-Forwarded-Proto", url.protocol);
  newRequest.headers.set("X-Forwarded-Host", url.hostname);
  newRequest.headers.set("X-Forwarded-Port", url.port);

  const response = await fetch(newRequest, {
    body: request.body,
    method: request.method,
    headers: new Headers(newRequest.headers),
    redirect: "manual",
  });

  return response;
};

/**
 * Upgrade and proxy websocket requests
 */
const handleWebSocket = (
  request: Request,
  newURL: URL,
): Response => {
  const { socket, response } = Deno.upgradeWebSocket(request);
  const remote = new WebSocket(newURL);
  socket.addEventListener("message", (ev) => remote.send(ev.data));
  remote.addEventListener("message", (ev) => socket.send(ev.data));
  socket.addEventListener("close", () => remote.close());
  remote.addEventListener("close", () => socket.close());
  socket.addEventListener("error", () => remote.close());
  remote.addEventListener("error", () => socket.close());
  return response;
};
