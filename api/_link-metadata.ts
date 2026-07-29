import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { parseInstagramHtmlMetadata } from "./_instagram-metadata.js";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 4;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const MAX_URL_LENGTH = 2_048;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

export type LinkMetadata = {
  url: string;
  canonicalUrl: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  provider: string;
  contentType: string;
  fetchedAt: string;
};

export type LinkMetadataResult =
  | ({ ok: true } & LinkMetadata)
  | {
      ok: false;
      url?: string;
      reason: string;
    };

export type FetchLinkMetadataOptions = {
  fetchImpl?: typeof fetch;
  resolveHostname?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
  now?: () => Date;
  disableCache?: boolean;
};

type CacheEntry = {
  expiresAt: number;
  result: { ok: true } & LinkMetadata;
};

const metadataCache = new Map<string, CacheEntry>();

const decodeHtmlEntities = (value: string): string => {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.toLocaleLowerCase("en-US").startsWith("#x")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return namedEntities[entity.toLocaleLowerCase("en-US")] ?? match;
  });
};

const cleanText = (value?: string): string | undefined => {
  if (!value) return undefined;
  const cleaned = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  return cleaned || undefined;
};

const normalizeInputUrl = (value: string): URL => {
  if (!value || value.length > MAX_URL_LENGTH) throw new Error("invalid-url");

  let url: URL;
  try {
    const trimmed = value.trim();
    url = new URL(trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed);
  } catch {
    throw new Error("invalid-url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid-protocol");
  if (url.username || url.password) throw new Error("credentials-not-allowed");
  if (
    (url.protocol === "http:" && url.port && url.port !== "80")
    || (url.protocol === "https:" && url.port && url.port !== "443")
  ) {
    throw new Error("port-not-allowed");
  }

  url.hash = "";
  return url;
};

const ipv4ToNumber = (address: string): number | undefined => {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return undefined;
  }
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
};

const isBlockedIpv4 = (address: string): boolean => {
  const value = ipv4ToNumber(address);
  if (value === undefined) return true;
  const [a, b, c] = address.split(".").map(Number);

  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
};

const parseIpv6 = (address: string): bigint | undefined => {
  let normalized = address.toLocaleLowerCase("en-US").split("%")[0];
  const ipv4Tail = normalized.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (ipv4Tail) {
    const ipv4 = ipv4ToNumber(ipv4Tail);
    if (ipv4 === undefined) return undefined;
    normalized = normalized.slice(0, -ipv4Tail.length)
      + `${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return undefined;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return undefined;
  const parts = halves.length === 2 ? [...left, ...Array(missing).fill("0"), ...right] : left;
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return undefined;

  return parts.reduce((result, part) => (result << 16n) + BigInt(`0x${part}`), 0n);
};

const isBlockedIpv6 = (address: string): boolean => {
  const value = parseIpv6(address);
  if (value === undefined) return true;
  if (value === 0n || value === 1n) return true;

  const top8 = Number(value >> 120n);
  const top7 = Number(value >> 121n);
  const top10 = Number(value >> 118n);
  const top32 = Number(value >> 96n);
  const ipv4MappedPrefix = value >> 32n;

  if (top8 === 0xff || top7 === 0x7e || top10 === 0x3fa) return true;
  if (top32 === 0x20010db8 || top32 === 0x20010002) return true;
  if (ipv4MappedPrefix === 0xffffn) {
    const ipv4 = Number(value & 0xffffffffn);
    return isBlockedIpv4([
      (ipv4 >>> 24) & 255,
      (ipv4 >>> 16) & 255,
      (ipv4 >>> 8) & 255,
      ipv4 & 255,
    ].join("."));
  }

  return false;
};

export const isBlockedIpAddress = (address: string): boolean => {
  const version = isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);
  return true;
};

const defaultResolveHostname = async (hostname: string): Promise<string[]> => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return Array.from(new Set(records.map((record) => record.address)));
};

const validateFetchTarget = async (
  url: URL,
  resolveHostname: (hostname: string) => Promise<string[]>,
): Promise<void> => {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid-protocol");
  if (url.username || url.password) throw new Error("credentials-not-allowed");

  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");
  if (
    BLOCKED_HOSTNAMES.has(hostname)
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
  ) {
    throw new Error("hostname-not-allowed");
  }

  const addresses = isIP(hostname) ? [hostname] : await resolveHostname(hostname);
  if (addresses.length === 0) throw new Error("dns-resolution-failed");
  if (addresses.some(isBlockedIpAddress)) throw new Error("private-address-not-allowed");
};

const readLimitedText = async (response: Response, maxBytes: number): Promise<string> => {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxBytes) throw new Error("response-too-large");
      text += decoder.decode(value, { stream: true });
      if (/<\/head\s*>/i.test(text)) break;
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
};

const fetchWithValidatedRedirects = async (
  initialUrl: URL,
  options: Required<Pick<FetchLinkMetadataOptions, "fetchImpl" | "resolveHostname" | "maxRedirects">>,
  signal: AbortSignal,
): Promise<{ response: Response; finalUrl: URL }> => {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= options.maxRedirects; redirectCount += 1) {
    await validateFetchTarget(currentUrl, options.resolveHostname);

    const response = await options.fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.7,en;q=0.6",
        "user-agent": "Chaejipbag-Link-Metadata/1.0 (+https://chaejipbag.vercel.app)",
      },
    });

    if (!REDIRECT_STATUSES.has(response.status)) return { response, finalUrl: currentUrl };
    if (redirectCount === options.maxRedirects) throw new Error("too-many-redirects");

    const location = response.headers.get("location");
    if (!location) throw new Error("invalid-redirect");
    currentUrl = normalizeInputUrl(new URL(location, currentUrl).href);
  }

  throw new Error("too-many-redirects");
};

const toAbsoluteHttpUrl = (value: string | undefined, baseUrl: URL): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
};

const getHtmlTitle = (html: string): string | undefined =>
  cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " "));

const getMetaDescription = (html: string): string | undefined => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/\bname\s*=\s*(?:"description"|'description'|description)(?:\s|\/?>)/i.test(tag)) continue;
    const content = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
    return cleanText(content?.slice(1).find(Boolean));
  }
  return undefined;
};

const isPinterestHostname = (hostname: string): boolean => {
  const normalized = hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  return normalized === "pin.it"
    || normalized.endsWith(".pin.it")
    || normalized === "pinterest.com"
    || /(^|\.)pinterest\.[a-z.]+$/.test(normalized);
};

const getProvider = (requestedUrl: URL, finalUrl: URL, siteName?: string): string => {
  if (isPinterestHostname(requestedUrl.hostname) || isPinterestHostname(finalUrl.hostname)) return "pinterest";
  return siteName || finalUrl.hostname.replace(/^www\./, "");
};

const pruneCache = (now: number): void => {
  for (const [key, entry] of metadataCache) {
    if (entry.expiresAt <= now) metadataCache.delete(key);
  }
  while (metadataCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = metadataCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    metadataCache.delete(oldestKey);
  }
};

export const fetchLinkMetadata = async (
  inputUrl: string,
  options: FetchLinkMetadataOptions = {},
): Promise<LinkMetadataResult> => {
  let requestedUrl: URL;
  try {
    requestedUrl = normalizeInputUrl(inputUrl);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "invalid-url" };
  }

  const useCache = !options.disableCache
    && !options.fetchImpl
    && !options.resolveHostname
    && !options.now;
  const cacheKey = requestedUrl.href;
  const currentTime = Date.now();
  const cached = useCache ? metadataCache.get(cacheKey) : undefined;
  if (cached && cached.expiresAt > currentTime) return cached.result;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const { response, finalUrl } = await fetchWithValidatedRedirects(
      requestedUrl,
      {
        fetchImpl: options.fetchImpl ?? fetch,
        resolveHostname: options.resolveHostname ?? defaultResolveHostname,
        maxRedirects: options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
      },
      controller.signal,
    );

    if (!response.ok) throw new Error("upstream-http-error");
    const contentType = response.headers.get("content-type")?.toLocaleLowerCase("en-US") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("unexpected-content-type");
    }

    const html = await readLimitedText(response, options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES);
    const parsed = parseInstagramHtmlMetadata(html);
    const canonicalCandidate = toAbsoluteHttpUrl(parsed.canonical, finalUrl);
    let canonicalUrl = finalUrl.href;
    if (canonicalCandidate) {
      try {
        await validateFetchTarget(new URL(canonicalCandidate), options.resolveHostname ?? defaultResolveHostname);
        canonicalUrl = canonicalCandidate;
      } catch {
        // Ignore unsafe or unresolvable canonical metadata and keep the validated final URL.
      }
    }
    const og = parsed.openGraph;
    const twitter = parsed.twitterCard;
    const title = cleanText(og["og:title"])
      ?? cleanText(twitter["twitter:title"])
      ?? getHtmlTitle(html);
    const description = cleanText(og["og:description"])
      ?? cleanText(twitter["twitter:description"])
      ?? getMetaDescription(html);
    const imageCandidate = toAbsoluteHttpUrl(
      og["og:image:secure_url"]
        ?? og["og:image"]
        ?? twitter["twitter:image"]
        ?? twitter["twitter:image:src"],
      finalUrl,
    );
    let imageUrl: string | undefined;
    if (imageCandidate) {
      try {
        await validateFetchTarget(new URL(imageCandidate), options.resolveHostname ?? defaultResolveHostname);
        imageUrl = imageCandidate;
      } catch {
        // Never expose a private-network image URL to the browser.
      }
    }
    const siteName = cleanText(og["og:site_name"]);
    const fetchedAt = (options.now?.() ?? new Date()).toISOString();
    const result: { ok: true } & LinkMetadata = {
      ok: true,
      url: requestedUrl.href,
      canonicalUrl,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(siteName ? { siteName } : {}),
      provider: getProvider(requestedUrl, finalUrl, siteName),
      contentType: contentType.split(";")[0].trim(),
      fetchedAt,
    };

    if (useCache) {
      pruneCache(currentTime);
      metadataCache.set(cacheKey, { expiresAt: currentTime + CACHE_TTL_MS, result });
    }
    return result;
  } catch (error) {
    const isTimeout = controller.signal.aborted
      || (error instanceof Error && error.name === "AbortError");
    return {
      ok: false,
      url: requestedUrl.href,
      reason: isTimeout ? "timeout" : error instanceof Error ? error.message : "fetch-failed",
    };
  } finally {
    clearTimeout(timeout);
  }
};

