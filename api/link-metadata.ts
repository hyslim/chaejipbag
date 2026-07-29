import { fetchLinkMetadata } from "./_link-metadata.js";

const jsonResponse = (body: unknown, status = 200, headers: HeadersInit = {}): Response =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "private, max-age=0, must-revalidate",
      ...headers,
    },
  });

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return jsonResponse({ ok: false, reason: "method-not-allowed" }, 405, { allow: "GET" });
    }

    const requestUrl = new URL(request.url);
    const inputUrl = requestUrl.searchParams.get("url") ?? "";
    if (!inputUrl) return jsonResponse({ ok: false, reason: "missing-url" }, 400);

    const result = await fetchLinkMetadata(inputUrl);
    const invalidReasons = new Set([
      "invalid-url",
      "invalid-protocol",
      "credentials-not-allowed",
      "port-not-allowed",
      "hostname-not-allowed",
      "private-address-not-allowed",
    ]);
    return jsonResponse(result, !result.ok && invalidReasons.has(result.reason) ? 400 : 200);
  },
};

