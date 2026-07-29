import assert from "node:assert/strict";
import test from "node:test";
import handler from "./link-metadata";
import { fetchLinkMetadata, isBlockedIpAddress } from "./_link-metadata";

const publicResolver = async () => ["93.184.216.34"];

const htmlResponse = (html: string, init: ResponseInit = {}) =>
  new Response(html, {
    status: 200,
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...init.headers,
    },
  });

test("blocks local, private, link-local, multicast, and IPv4-mapped IPv6 addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isBlockedIpAddress(address), true, address);
  }
  assert.equal(isBlockedIpAddress("93.184.216.34"), false);
  assert.equal(isBlockedIpAddress("2606:2800:220:1:248:1893:25c8:1946"), false);
});

test("follows a pin.it redirect and extracts prioritized Pinterest Open Graph metadata", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url === "https://pin.it/abc") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://kr.pinterest.com/pin/123/" },
      });
    }
    return htmlResponse(`
      <html><head>
        <title>HTML title</title>
        <meta name="description" content="HTML description">
        <meta name="twitter:title" content="Twitter title">
        <meta name="twitter:description" content="Twitter description">
        <meta name="twitter:image" content="/twitter.jpg">
        <meta property="og:title" content="Real pin title">
        <meta property="og:description" content="Pin description">
        <meta property="og:image" content="/pin.jpg">
        <meta property="og:image:secure_url" content="//images.example/secure.jpg">
        <meta property="og:site_name" content="Pinterest">
        <link rel="canonical" href="/pin/123/">
      </head></html>
    `);
  }) as typeof fetch;

  const result = await fetchLinkMetadata("https://pin.it/abc#tracking", {
    fetchImpl,
    resolveHostname: publicResolver,
    now: () => new Date("2026-07-29T00:00:00.000Z"),
    disableCache: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(calls, ["https://pin.it/abc", "https://kr.pinterest.com/pin/123/"]);
  assert.equal(result.url, "https://pin.it/abc");
  assert.equal(result.canonicalUrl, "https://kr.pinterest.com/pin/123/");
  assert.equal(result.title, "Real pin title");
  assert.equal(result.description, "Pin description");
  assert.equal(result.imageUrl, "https://images.example/secure.jpg");
  assert.equal(result.siteName, "Pinterest");
  assert.equal(result.provider, "pinterest");
  assert.equal(result.contentType, "text/html");
  assert.equal(result.fetchedAt, "2026-07-29T00:00:00.000Z");
});

test("supports a full pinterest.com pin URL without a redirect", async () => {
  const result = await fetchLinkMetadata("https://www.pinterest.com/pin/456/", {
    fetchImpl: (async () => htmlResponse("<title>Saved pin</title>")) as typeof fetch,
    resolveHostname: publicResolver,
    disableCache: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.provider, "pinterest");
    assert.equal(result.title, "Saved pin");
  }
});

test("falls back through Twitter, HTML title, and meta description without requiring an image", async () => {
  const twitter = await fetchLinkMetadata("https://example.com/twitter", {
    fetchImpl: (async () => htmlResponse(`
      <meta content="Twitter title" name="twitter:title">
      <meta content="Twitter description" name="twitter:description">
      <title>HTML title</title>
    `)) as typeof fetch,
    resolveHostname: publicResolver,
    disableCache: true,
  });
  assert.equal(twitter.ok && twitter.title, "Twitter title");
  assert.equal(twitter.ok && twitter.description, "Twitter description");

  const html = await fetchLinkMetadata("https://example.com/plain", {
    fetchImpl: (async () => htmlResponse(`
      <title>Plain &amp; useful</title>
      <meta content="Plain description" name="description">
    `)) as typeof fetch,
    resolveHostname: publicResolver,
    disableCache: true,
  });
  assert.equal(html.ok && html.title, "Plain & useful");
  assert.equal(html.ok && html.description, "Plain description");
  assert.equal(html.ok && html.imageUrl, undefined);
});

test("rejects invalid schemes, localhost, private IPs, and private redirect targets", async () => {
  assert.equal((await fetchLinkMetadata("file:///etc/passwd")).reason, "invalid-protocol");
  assert.equal((await fetchLinkMetadata("not a url")).reason, "invalid-url");

  const localhost = await fetchLinkMetadata("http://localhost/", {
    fetchImpl: (async () => htmlResponse("<title>no</title>")) as typeof fetch,
    resolveHostname: publicResolver,
    disableCache: true,
  });
  assert.equal(localhost.ok, false);
  if (!localhost.ok) assert.equal(localhost.reason, "hostname-not-allowed");

  const privateIp = await fetchLinkMetadata("http://169.254.169.254/latest/meta-data/", {
    fetchImpl: (async () => htmlResponse("<title>no</title>")) as typeof fetch,
    resolveHostname: publicResolver,
    disableCache: true,
  });
  assert.equal(privateIp.ok, false);
  if (!privateIp.ok) assert.equal(privateIp.reason, "private-address-not-allowed");

  const redirect = await fetchLinkMetadata("https://example.com/redirect", {
    fetchImpl: (async () => new Response(null, {
      status: 302,
      headers: { location: "http://192.168.0.10/admin" },
    })) as typeof fetch,
    resolveHostname: publicResolver,
    disableCache: true,
  });
  assert.equal(redirect.ok, false);
  if (!redirect.ok) assert.equal(redirect.reason, "private-address-not-allowed");
});

test("does not parse PDFs or direct images as HTML metadata", async () => {
  for (const contentType of ["application/pdf", "image/jpeg"]) {
    const result = await fetchLinkMetadata(`https://example.com/${contentType.includes("pdf") ? "file.pdf" : "image.jpg"}`, {
      fetchImpl: (async () => new Response("not html", {
        headers: { "content-type": contentType },
      })) as typeof fetch,
      resolveHostname: publicResolver,
      disableCache: true,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "unexpected-content-type");
  }
});

test("enforces timeout and response size limits", async () => {
  const timeout = await fetchLinkMetadata("https://example.com/slow", {
    fetchImpl: ((_: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as typeof fetch,
    resolveHostname: publicResolver,
    timeoutMs: 5,
    disableCache: true,
  });
  assert.equal(timeout.ok, false);
  if (!timeout.ok) assert.equal(timeout.reason, "timeout");

  const oversized = await fetchLinkMetadata("https://example.com/large", {
    fetchImpl: (async () => htmlResponse("x".repeat(30), {
      headers: { "content-type": "text/html", "content-length": "30" },
    })) as typeof fetch,
    resolveHostname: publicResolver,
    maxResponseBytes: 20,
    disableCache: true,
  });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.equal(oversized.reason, "response-too-large");
});

test("API handler validates method and missing URL before fetching", async () => {
  const methodResponse = await handler.fetch(new Request("https://example.test/api/link-metadata", {
    method: "POST",
  }));
  assert.equal(methodResponse.status, 405);

  const missingResponse = await handler.fetch(new Request("https://example.test/api/link-metadata"));
  assert.equal(missingResponse.status, 400);
  assert.equal((await missingResponse.json()).reason, "missing-url");
});
