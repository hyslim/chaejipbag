import { normalizePokachipName, type Fragment } from "@/data/fragments";

export type ShareFragmentResult = "shared" | "copied" | "canceled" | "failed";

const isCanceledShareError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLocaleLowerCase("en-US");
  return error.name === "AbortError" || message.includes("abort") || message.includes("cancel");
};

const canUseNativeShare = (): boolean => {
  if (!navigator.share) return false;

  const userAgent = navigator.userAgent || "";
  const isMobileUserAgent = /Android|iPhone|iPad|Mobile/i.test(userAgent);
  const isIpadDesktopMode = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;

  return isMobileUserAgent || isIpadDesktopMode;
};

const getFragmentUrl = (fragment: Fragment): string => fragment.url?.trim() ?? "";

const getFragmentTags = (fragment: Fragment): string =>
  (fragment.pokachips ?? [])
    .map(normalizePokachipName)
    .filter(Boolean)
    .map((chip) => `#${chip.replace(/\s+/g, "_")}`)
    .join(" ");

export const getFragmentShareText = (fragment: Fragment): string => {
  const title = fragment.title.trim();
  const memo = fragment.memo?.trim() ?? "";
  const url = getFragmentUrl(fragment);
  const chips = getFragmentTags(fragment);

  return [title, memo && memo !== title ? memo : "", url, chips]
    .filter(Boolean)
    .join("\n\n");
};

const copyShareText = async (text: string): Promise<boolean> => {
  if (!navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const shareFragment = async (fragment: Fragment): Promise<ShareFragmentResult> => {
  const title = fragment.title.trim() || "채집가방 조각";
  const memo = fragment.memo?.trim() ?? "";
  const url = getFragmentUrl(fragment);
  const tags = getFragmentTags(fragment);
  const text = getFragmentShareText(fragment);
  const textWithoutUrl = [title, memo && memo !== title ? memo : "", tags]
    .filter(Boolean)
    .join("\n\n");

  if (canUseNativeShare()) {
    try {
      await navigator.share({
        title,
        text: url ? textWithoutUrl : text,
        ...(url ? { url } : {}),
      });
      return "shared";
    } catch (error) {
      if (isCanceledShareError(error)) return "canceled";
    }
  }

  return (await copyShareText(text)) ? "copied" : "failed";
};
