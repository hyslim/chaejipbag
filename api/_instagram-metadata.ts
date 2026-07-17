const ALLOWED_INSTAGRAM_HOSTNAMES = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;

export type InstagramPostType = "post" | "reel" | "carousel";

export type InstagramMetadataResult = {
  ok: boolean;
  platform: "instagram";
  normalizedUrl?: string;
  type?: InstagramPostType;
  typeCandidates?: InstagramPostType[];
  username?: string;
  caption?: string;
  title?: string;
  thumbnailUrl?: string;
  source?: "open-graph" | "twitter-card" | "json-ld" | "url-only";
  metadataPresence?: {
    openGraph: boolean;
    twitterCard: boolean;
    jsonLd: boolean;
    canonical: boolean;
  };
  upstreamStatus?: number;
  responseTimeMs?: number;
  reason?: string;
};

export type FetchInstagramMetadataOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
};

type NormalizedInstagramUrl = {
  normalizedUrl: string;
  pathType: "post" | "reel";
  shortcode: string;
};

type ParsedHtmlMetadata = {
  canonical?: string;
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  jsonLd: unknown[];
};

type JsonLdCandidates = {
  username?: string;
  caption?: string;
  title?: string;
  thumbnailUrl?: string;
  imageCount: number;
  hasVideo: boolean;
};

const failure = (
  reason: string,
  fields: Partial<InstagramMetadataResult> = {},
): InstagramMetadataResult => ({
  ok: false,
  platform: "instagram",
  ...fields,
  reason,
});

const validateFetchTarget = (url: URL): string | undefined => {
  if (url.protocol !== "https:") return "invalid-protocol";
  if (url.username || url.password) return "credentials-not-allowed";
  if (url.port) return "port-not-allowed";
  if (!ALLOWED_INSTAGRAM_HOSTNAMES.has(url.hostname.toLocaleLowerCase("en-US"))) {
    return "hostname-not-allowed";
  }
  return undefined;
};

export const normalizeInstagramPostUrl = (value: string): NormalizedInstagramUrl => {
  if (!value || value.length > 2_048) throw new Error("invalid-url");

  let url: URL;
  try {
    const trimmed = value.trim();
    url = new URL(trimmed.startsWith("www.") || trimmed.startsWith("m.") ? `https://${trimmed}` : trimmed);
  } catch {
    throw new Error("invalid-url");
  }

  if (url.protocol === "http:") url.protocol = "https:";

  const targetError = validateFetchTarget(url);
  if (targetError) throw new Error(targetError);

  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(pathParts[1])) {
    throw new Error("unsupported-instagram-url");
  }

  const rawType = pathParts[0].toLocaleLowerCase("en-US");
  if (!new Set(["p", "reel", "reels", "tv"]).has(rawType)) {
    throw new Error("unsupported-instagram-url");
  }

  const pathType = rawType === "p" ? "post" : "reel";
  const canonicalPath = pathType === "post" ? "p" : "reel";
  const shortcode = pathParts[1];

  return {
    normalizedUrl: `https://www.instagram.com/${canonicalPath}/${shortcode}/`,
    pathType,
    shortcode,
  };
};

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
    if (entity.startsWith("#x")) {
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

const parseTagAttributes = (tag: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(tag))) {
    const name = match[1].toLocaleLowerCase("en-US");
    if (name === "meta" || name === "link" || name.startsWith("<")) continue;
    attributes[name] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attributes;
};

export const parseInstagramHtmlMetadata = (html: string): ParsedHtmlMetadata => {
  const openGraph: Record<string, string> = {};
  const twitterCard: Record<string, string> = {};
  let canonical: string | undefined;

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = parseTagAttributes(tag);
    const key = (attributes.property || attributes.name || "").toLocaleLowerCase("en-US");
    const content = cleanText(attributes.content);
    if (!key || !content) continue;
    if (key.startsWith("og:")) openGraph[key] ??= content;
    if (key.startsWith("twitter:")) twitterCard[key] ??= content;
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attributes = parseTagAttributes(tag);
    const relations = (attributes.rel || "").toLocaleLowerCase("en-US").split(/\s+/);
    if (relations.includes("canonical") && attributes.href) {
      canonical = attributes.href;
      break;
    }
  }

  const jsonLd: unknown[] = [];
  const jsonLdPattern = /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch: RegExpExecArray | null;
  while ((jsonLdMatch = jsonLdPattern.exec(html)) && jsonLd.length < 10) {
    try {
      jsonLd.push(JSON.parse(decodeHtmlEntities(jsonLdMatch[1]).trim()));
    } catch {
      // Ignore malformed structured data; the public metadata tags remain usable.
    }
  }

  return { canonical, openGraph, twitterCard, jsonLd };
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string") {
      const cleaned = cleanText(value);
      if (cleaned) return cleaned;
    }
  }
  return undefined;
};

const validUsername = (value?: string): string | undefined => {
  const username = value?.replace(/^@/, "");
  return username && /^[A-Za-z0-9._]{1,30}$/.test(username) ? username : undefined;
};

const getJsonLdCandidates = (values: unknown[]): JsonLdCandidates => {
  const candidates: JsonLdCandidates = { imageCount: 0, hasVideo: false };
  const queue = [...values];
  let inspected = 0;

  while (queue.length && inspected < 500) {
    inspected += 1;
    const value = queue.shift();
    if (Array.isArray(value)) {
      queue.push(...value.slice(0, 50));
      continue;
    }

    const record = asRecord(value);
    if (!record) continue;

    const type = firstString(record["@type"]);
    if (type?.toLocaleLowerCase("en-US").includes("video")) candidates.hasVideo = true;

    const author = asRecord(record.author);
    candidates.username ??= validUsername(firstString(author?.alternateName, author?.name));
    candidates.caption ??= firstString(record.articleBody, record.caption, record.description);
    candidates.title ??= firstString(record.headline, record.name);

    const image = record.image;
    if (Array.isArray(image)) {
      candidates.imageCount = Math.max(candidates.imageCount, image.length);
      candidates.thumbnailUrl ??= firstString(image[0], asRecord(image[0])?.url, asRecord(image[0])?.contentUrl);
    } else if (typeof image === "string") {
      candidates.imageCount = Math.max(candidates.imageCount, 1);
      candidates.thumbnailUrl ??= cleanText(image);
    } else {
      const imageRecord = asRecord(image);
      if (imageRecord) {
        candidates.imageCount = Math.max(candidates.imageCount, 1);
        candidates.thumbnailUrl ??= firstString(imageRecord.url, imageRecord.contentUrl);
      }
    }

    for (const nested of Object.values(record)) {
      if (typeof nested === "object" && nested !== null) queue.push(nested);
    }
  }

  return candidates;
};

const getUsernameFromText = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    if (!value) continue;
    const username =
      value.match(/^@?([A-Za-z0-9._]{1,30})\s+(?:on|•)\s+Instagram\b/i)?.[1]
      ?? value.match(/[-–—]\s*@?([A-Za-z0-9._]{1,30})\s+on\s+[^:]+:\s*[“"]/i)?.[1]
      ?? value.match(/^[^()\r\n]{0,100}\s+\(@([A-Za-z0-9._]{1,30})\)\s+(?:on|•)\s+Instagram\b/i)?.[1];
    const valid = validUsername(username);
    if (valid) return valid;
  }
  return undefined;
};

const getCaptionFromDescription = (value?: string): string | undefined => {
  if (!value) return undefined;
  const openingQuote = Math.max(value.indexOf('"'), value.indexOf("“"));
  const closingQuote = Math.max(value.lastIndexOf('"'), value.lastIndexOf("”"));
  if (openingQuote >= 0 && closingQuote > openingQuote) {
    return cleanText(value.slice(openingQuote + 1, closingQuote));
  }
  return undefined;
};

const getFirstSentence = (value?: string): string | undefined => {
  const cleaned = cleanText(value);
  if (!cleaned) return undefined;
  const sentence = cleaned.match(/^(.{1,180}?[.!?](?:\s|$)|.{1,180})/u)?.[1] ?? cleaned;
  return sentence.trim();
};

const safeHttpUrl = (value?: string): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const readLimitedText = async (response: Response, maxBytes: number): Promise<string> => {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("response-too-large");
  }
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
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
};

const fetchWithValidatedRedirects = async (
  initialUrl: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
  maxRedirects: number,
): Promise<Response> => {
  let currentUrl = new URL(initialUrl);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const targetError = validateFetchTarget(currentUrl);
    if (targetError) throw new Error(redirectCount ? "redirect-hostname-not-allowed" : targetError);

    const response = await fetchImpl(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9",
        "accept-language": "en-US,en;q=0.8",
        "user-agent": "Chaejipbag-Instagram-Metadata-Spike/1.0",
      },
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirectCount === maxRedirects) throw new Error("too-many-redirects");

    const location = response.headers.get("location");
    if (!location) throw new Error("invalid-redirect");
    currentUrl = new URL(location, currentUrl);
  }

  throw new Error("too-many-redirects");
};

const looksLikeLoginOrChallenge = (responseUrl: string, html: string): boolean => {
  let pathname = "";
  try {
    pathname = new URL(responseUrl).pathname;
  } catch {
    // The response URL can be empty in test doubles; HTML checks still apply.
  }
  return /\/(accounts\/login|challenge)\b/i.test(pathname)
    || /<form[^>]+(?:loginForm|login-form)/i.test(html)
    || /(?:Log in|Sign up)\s*[•|]\s*Instagram/i.test(html.slice(0, 100_000));
};

export const fetchInstagramMetadata = async (
  inputUrl: string,
  options: FetchInstagramMetadataOptions = {},
): Promise<InstagramMetadataResult> => {
  const startedAt = Date.now();
  let normalized: NormalizedInstagramUrl;
  try {
    normalized = normalizeInstagramPostUrl(inputUrl);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "invalid-url", {
      responseTimeMs: Date.now() - startedAt,
    });
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let upstreamStatus: number | undefined;

  try {
    const response = await fetchWithValidatedRedirects(
      normalized.normalizedUrl,
      options.fetchImpl ?? fetch,
      controller.signal,
      maxRedirects,
    );
    upstreamStatus = response.status;
    const baseFields = {
      normalizedUrl: normalized.normalizedUrl,
      type: normalized.pathType,
      typeCandidates: normalized.pathType === "post" ? ["post", "carousel"] as InstagramPostType[] : ["reel"] as InstagramPostType[],
      upstreamStatus: response.status,
      responseTimeMs: Date.now() - startedAt,
    };

    if (response.status === 404 || response.status === 410) return failure("not-found", baseFields);
    if (response.status === 401 || response.status === 403) return failure("access-denied", baseFields);
    if (!response.ok) return failure("upstream-http-error", baseFields);

    const contentType = response.headers.get("content-type")?.toLocaleLowerCase("en-US") ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return failure("unexpected-content-type", baseFields);
    }

    const html = await readLimitedText(response, maxResponseBytes);
    if (looksLikeLoginOrChallenge(response.url, html)) {
      return failure("login-or-challenge-page", {
        ...baseFields,
        responseTimeMs: Date.now() - startedAt,
      });
    }

    const parsed = parseInstagramHtmlMetadata(html);
    const jsonLd = getJsonLdCandidates(parsed.jsonLd);
    const ogTitle = cleanText(parsed.openGraph["og:title"]);
    const ogDescription = cleanText(parsed.openGraph["og:description"]);
    const twitterTitle = cleanText(parsed.twitterCard["twitter:title"]);
    const twitterDescription = cleanText(parsed.twitterCard["twitter:description"]);
    const username = jsonLd.username ?? getUsernameFromText(ogTitle, twitterTitle, ogDescription, twitterDescription);
    const caption = jsonLd.caption
      ?? getCaptionFromDescription(ogDescription)
      ?? getCaptionFromDescription(twitterDescription);
    const rawTitle = jsonLd.title ?? ogTitle ?? twitterTitle;
    const title = getFirstSentence(caption) ?? rawTitle;
    const thumbnailUrl = safeHttpUrl(
      jsonLd.thumbnailUrl
      ?? parsed.openGraph["og:image"]
      ?? parsed.twitterCard["twitter:image"],
    );

    let type: InstagramPostType = normalized.pathType;
    let typeCandidates: InstagramPostType[] = normalized.pathType === "post"
      ? ["post", "carousel"]
      : ["reel"];
    if (normalized.pathType === "post" && jsonLd.imageCount > 1) {
      type = "carousel";
      typeCandidates = ["carousel"];
    }
    if (jsonLd.hasVideo) {
      type = "reel";
      typeCandidates = ["reel"];
    }

    let normalizedUrl = normalized.normalizedUrl;
    if (parsed.canonical) {
      try {
        const canonical = normalizeInstagramPostUrl(parsed.canonical);
        if (canonical.shortcode === normalized.shortcode) {
          normalizedUrl = canonical.normalizedUrl;
          if (canonical.pathType === "reel") {
            type = "reel";
            typeCandidates = ["reel"];
          }
        }
      } catch {
        // Never trust a canonical URL that escapes the supported Instagram URL set.
      }
    }

    const metadataPresence = {
      openGraph: Object.keys(parsed.openGraph).length > 0,
      twitterCard: Object.keys(parsed.twitterCard).length > 0,
      jsonLd: parsed.jsonLd.length > 0,
      canonical: Boolean(parsed.canonical),
    };
    const source = jsonLd.caption || jsonLd.thumbnailUrl || jsonLd.username
      ? "json-ld" as const
      : Object.keys(parsed.openGraph).length
        ? "open-graph" as const
        : Object.keys(parsed.twitterCard).length
          ? "twitter-card" as const
          : "url-only" as const;

    if (!username && !caption && !thumbnailUrl && !rawTitle) {
      return failure("metadata-not-available", {
        ...baseFields,
        normalizedUrl,
        type,
        typeCandidates,
        source,
        metadataPresence,
        responseTimeMs: Date.now() - startedAt,
      });
    }

    return {
      ok: true,
      platform: "instagram",
      normalizedUrl,
      type,
      typeCandidates,
      username,
      caption,
      title,
      thumbnailUrl,
      source,
      metadataPresence,
      upstreamStatus: response.status,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (error) {
    const isTimeout = controller.signal.aborted
      || (error instanceof Error && error.name === "AbortError");
    return failure(isTimeout ? "timeout" : error instanceof Error ? error.message : "fetch-failed", {
      normalizedUrl: normalized.normalizedUrl,
      type: normalized.pathType,
      typeCandidates: normalized.pathType === "post" ? ["post", "carousel"] : ["reel"],
      upstreamStatus,
      responseTimeMs: Date.now() - startedAt,
    });
  } finally {
    clearTimeout(timeout);
  }
};
