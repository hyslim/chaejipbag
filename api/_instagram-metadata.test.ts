import assert from "node:assert/strict";
import test from "node:test";
import handler from "./instagram-metadata";
import {
  fetchInstagramMetadata,
  normalizeInstagramPostUrl,
  parseInstagramHtmlMetadata,
} from "./_instagram-metadata";

const asFetch = (implementation: (input: URL, init?: RequestInit) => Promise<Response>): typeof fetch =>
  implementation as unknown as typeof fetch;

test("normalizes supported Instagram post URLs and removes query/hash", () => {
  const cases = [
    ["https://instagram.com/p/AbC_123-/?igsh=tracking#fragment", "https://www.instagram.com/p/AbC_123-/", "post"],
    ["http://instagram.com/p/HTTP123/", "https://www.instagram.com/p/HTTP123/", "post"],
    ["https://www.instagram.com/reel/REEL123/?utm_source=share", "https://www.instagram.com/reel/REEL123/", "reel"],
    ["https://m.instagram.com/reels/REELS123/", "https://www.instagram.com/reel/REELS123/", "reel"],
    ["www.instagram.com/tv/TV123/?foo=bar", "https://www.instagram.com/reel/TV123/", "reel"],
  ] as const;

  for (const [input, normalizedUrl, pathType] of cases) {
    assert.deepEqual(normalizeInstagramPostUrl(input), {
      normalizedUrl,
      pathType,
      shortcode: normalizedUrl.split("/").at(-2),
    });
  }
});

test("rejects non-post paths and SSRF-shaped URLs", () => {
  const invalidUrls = [
    "file:///etc/passwd",
    "https://instagram.com.evil.example/p/code/",
    "https://www.instagram.com@evil.example/p/code/",
    "https://www.instagram.com:8443/p/code/",
    "https://www.instagram.com/accounts/login/",
    "https://www.instagram.com/p/code/embed/",
    "https://127.0.0.1/p/code/",
  ];

  for (const input of invalidUrls) {
    assert.throws(() => normalizeInstagramPostUrl(input));
  }
});

test("parses Open Graph, Twitter, canonical, and JSON-LD without DOM selectors", () => {
  const html = `<!doctype html><html><head>
    <meta content="alice on Instagram: &quot;First sentence. More text&quot;" property="og:title">
    <meta property='og:image' content='https://cdn.example/image.jpg?x=1&amp;y=2'>
    <meta name="twitter:description" content="fallback">
    <link href="https://www.instagram.com/p/ABC/" rel="alternate canonical">
    <script type="application/ld+json">{"@type":"SocialMediaPosting","author":{"alternateName":"alice"},"articleBody":"A caption","image":["https://cdn.example/1.jpg","https://cdn.example/2.jpg"]}</script>
  </head></html>`;

  const parsed = parseInstagramHtmlMetadata(html);
  assert.equal(parsed.openGraph["og:title"], 'alice on Instagram: "First sentence. More text"');
  assert.equal(parsed.openGraph["og:image"], "https://cdn.example/image.jpg?x=1&y=2");
  assert.equal(parsed.twitterCard["twitter:description"], "fallback");
  assert.equal(parsed.canonical, "https://www.instagram.com/p/ABC/");
  assert.equal(parsed.jsonLd.length, 1);
});

test("extracts public metadata and detects a structured carousel candidate", async () => {
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="alice on Instagram: &quot;Fallback caption&quot;">
    <meta property="og:image" content="https://scontent.cdninstagram.com/cover.jpg">
    <link rel="canonical" href="https://instagram.com/p/ABC/">
    <script type="application/ld+json">{
      "@type":"SocialMediaPosting",
      "author":{"alternateName":"@alice"},
      "articleBody":"First sentence. This is the rest.",
      "image":["https://scontent.cdninstagram.com/one.jpg","https://scontent.cdninstagram.com/two.jpg"]
    }</script>
  </head></html>`;
  const fetchImpl = asFetch(async () => new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  }));

  const result = await fetchInstagramMetadata("https://m.instagram.com/p/ABC/?igsh=1", { fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.normalizedUrl, "https://www.instagram.com/p/ABC/");
  assert.equal(result.type, "carousel");
  assert.equal(result.username, "alice");
  assert.equal(result.caption, "First sentence. This is the rest.");
  assert.equal(result.title, "First sentence.");
  assert.equal(result.thumbnailUrl, "https://scontent.cdninstagram.com/one.jpg");
  assert.equal(result.source, "json-ld");
});

test("does not follow a redirect outside the Instagram hostname allowlist", async () => {
  const fetchImpl = asFetch(async () => new Response(null, {
    status: 302,
    headers: { location: "https://evil.example/collect" },
  }));

  const result = await fetchInstagramMetadata("https://www.instagram.com/p/ABC/", { fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "redirect-hostname-not-allowed");
});

test("aborts a slow upstream request", async () => {
  const fetchImpl = asFetch(async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));

  const result = await fetchInstagramMetadata("https://www.instagram.com/reel/ABC/", {
    fetchImpl,
    timeoutMs: 10,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "timeout");
});

test("rejects an oversized HTML response", async () => {
  const fetchImpl = asFetch(async () => new Response("x".repeat(200), {
    status: 200,
    headers: { "content-type": "text/html" },
  }));

  const result = await fetchInstagramMetadata("https://www.instagram.com/p/ABC/", {
    fetchImpl,
    maxResponseBytes: 100,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "response-too-large");
});

test("returns a safe metadata-not-available fallback", async () => {
  const fetchImpl = asFetch(async () => new Response("<html><head><title>Instagram</title></head></html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  }));

  const result = await fetchInstagramMetadata("https://www.instagram.com/p/ABC/", { fetchImpl });
  assert.deepEqual(result.ok, false);
  assert.equal(result.reason, "metadata-not-available");
  assert.equal(result.type, "post");
  assert.equal(result.normalizedUrl, "https://www.instagram.com/p/ABC/");
});

test("endpoint validates method, missing URL, and invalid hostname", async () => {
  const methodResponse = await handler.fetch(new Request("https://example.test/api/instagram-metadata", { method: "POST" }));
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get("allow"), "GET");

  const missingResponse = await handler.fetch(new Request("https://example.test/api/instagram-metadata"));
  assert.equal(missingResponse.status, 400);

  const invalidResponse = await handler.fetch(new Request("https://example.test/api/instagram-metadata?url=https%3A%2F%2Fevil.example%2Fp%2Fx"));
  assert.equal(invalidResponse.status, 400);
  assert.equal((await invalidResponse.json() as { reason: string }).reason, "hostname-not-allowed");
});
