import assert from "node:assert/strict";
import test from "node:test";
import { fetchInstagramMetadata } from "./_instagram-metadata";

const asFetch = (html: string): typeof fetch =>
  (async () => new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  })) as unknown as typeof fetch;

test("does not mistake a caption mention for the author username", async () => {
  const html = `<!doctype html><head>
    <meta property="og:description" content='5 likes - actual.author on March 1, 2026: “Hello from @mentioned_account and (@another_mention).”'>
    <meta property="og:image" content="https://scontent.cdninstagram.com/cover.jpg">
  </head>`;

  const result = await fetchInstagramMetadata("https://www.instagram.com/p/ABC/", { fetchImpl: asFetch(html) });
  assert.equal(result.ok, true);
  assert.equal(result.username, "actual.author");
});

test("uses a same-shortcode reel canonical URL as the stronger type signal", async () => {
  const html = `<!doctype html><head>
    <meta property="og:title" content='author on Instagram: “A caption.”'>
    <meta property="og:image" content="https://scontent.cdninstagram.com/cover.jpg">
    <link rel="canonical" href="https://www.instagram.com/reel/ABC/">
  </head>`;

  const result = await fetchInstagramMetadata("https://www.instagram.com/p/ABC/", { fetchImpl: asFetch(html) });
  assert.equal(result.ok, true);
  assert.equal(result.normalizedUrl, "https://www.instagram.com/reel/ABC/");
  assert.equal(result.type, "reel");
  assert.deepEqual(result.typeCandidates, ["reel"]);
});
