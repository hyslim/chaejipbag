import { fetchInstagramMetadata } from "./_instagram-metadata";

const jsonResponse = (body: unknown, status = 200, headers: HeadersInit = {}): Response =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") {
      return jsonResponse(
        { ok: false, platform: "instagram", reason: "method-not-allowed" },
        405,
        { allow: "GET" },
      );
    }

    const requestUrl = new URL(request.url);
    const inputUrl = requestUrl.searchParams.get("url") ?? "";
    if (!inputUrl) {
      return jsonResponse(
        { ok: false, platform: "instagram", reason: "missing-url" },
        400,
      );
    }

    const result = await fetchInstagramMetadata(inputUrl);
    const invalidReasons = new Set([
      "invalid-url",
      "invalid-protocol",
      "credentials-not-allowed",
      "port-not-allowed",
      "hostname-not-allowed",
      "unsupported-instagram-url",
    ]);

    return jsonResponse(result, !result.ok && invalidReasons.has(result.reason ?? "") ? 400 : 200);
  },
};
