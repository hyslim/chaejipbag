const instagramReservedPaths = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "accounts",
  "direct",
  "tv",
  "share",
  "developer",
  "about",
  "instagram",
  "post",
]);

const getInstagramUrl = (value?: string | null): URL | null => {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    const url = new URL(trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed);
    const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "").replace(/^m\./, "");
    return hostname === "instagram.com" ? url : null;
  } catch {
    return null;
  }
};

const getValidInstagramUsername = (value?: string): string | null => {
  if (!value || !/^[A-Za-z0-9._]{1,30}$/.test(value)) return null;
  if (value.startsWith(".") || value.endsWith(".") || value.includes("..")) return null;
  return instagramReservedPaths.has(value.toLocaleLowerCase("en-US")) ? null : value;
};

export const isInstagramUrl = (value?: string | null): boolean => Boolean(getInstagramUrl(value));

export const getInstagramUsername = (text?: string | null, urlValue?: string | null): string | null => {
  const cleanText = text?.trim() ?? "";
  const explicitUsername = cleanText.match(/(?:^|[^A-Za-z0-9._])@([A-Za-z0-9._]{1,30})(?![A-Za-z0-9._])/)?.[1];
  const validExplicitUsername = getValidInstagramUsername(explicitUsername);
  if (validExplicitUsername) return validExplicitUsername;

  const contextualUsername = cleanText.match(/(?:^|\s)([A-Za-z0-9._]{1,30})\s*(?:•\s*Instagram\b|on\s+Instagram\b|님의)/i)?.[1];
  const validContextualUsername = getValidInstagramUsername(contextualUsername);
  if (validContextualUsername) return validContextualUsername;

  const url = getInstagramUrl(urlValue);
  if (!url) return null;

  const pathParts = url.pathname.split("/").filter(Boolean);
  return pathParts.length === 1 ? getValidInstagramUsername(pathParts[0]) : null;
};

export const getInstagramSuggestedTitle = (text?: string | null, url?: string | null): string => {
  const username = getInstagramUsername(text, url);
  return username ? `@${username}님의 게시물` : "Instagram 조각";
};
