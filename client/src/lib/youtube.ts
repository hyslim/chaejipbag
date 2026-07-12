const normalizeYouTubeUrl = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed;
};

export const getYouTubeVideoId = (value?: string | null): string | null => {
  if (!value) return null;

  try {
    const url = new URL(normalizeYouTubeUrl(value));
    const hostname = url.hostname
      .toLocaleLowerCase("en-US")
      .replace(/^www\./, "")
      .replace(/^m\./, "");
    let candidate = "";

    if (hostname === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      if (url.pathname === "/watch") {
        candidate = url.searchParams.get("v") ?? "";
      } else {
        const [type, id] = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live", "v"].includes(type)) candidate = id ?? "";
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
};

export const getYouTubeThumbnailUrl = (value?: string | null): string | null => {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
};
