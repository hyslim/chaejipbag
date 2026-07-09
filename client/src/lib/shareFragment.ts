import type { Fragment } from "@/data/fragments";
import { dataUrlToBlob, getImageBlob } from "@/data/imageStore";

export type ShareFragmentResult = "shared" | "shared-and-copied" | "copied" | "canceled" | "failed";

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

export const shouldOfferImageShare = (fragment: Fragment): boolean =>
  Boolean(fragment.imageKey || fragment.imageDataUrl);

const getFragmentUrl = (fragment: Fragment): string => fragment.url?.trim() ?? "";

export const getFragmentShareText = (fragment: Fragment): string => {
  const title = fragment.title.trim();
  const memo = fragment.memo?.trim() ?? "";
  const url = getFragmentUrl(fragment);
  const originalLink = url ? `원본 링크\n${url}` : "";

  return [title, memo && memo !== title ? memo : "", originalLink]
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

export const copyFragmentShareText = async (fragment: Fragment): Promise<ShareFragmentResult> =>
  (await copyShareText(getFragmentShareText(fragment))) ? "copied" : "failed";

const getImageExtension = (type: string): string => {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
};

const getFragmentImageFile = async (fragment: Fragment): Promise<File | undefined> => {
  let blob: Blob | undefined;

  if (fragment.imageKey) {
    try {
      blob = await getImageBlob(fragment.imageKey);
    } catch {
      // Fall back to legacy imageDataUrl below.
    }
  }

  if (!blob && fragment.imageDataUrl) {
    try {
      blob = await dataUrlToBlob(fragment.imageDataUrl);
    } catch {
      return undefined;
    }
  }

  if (!blob) return undefined;

  const type = blob.type || "image/jpeg";
  try {
    return new File([blob], `chaejipbag-fragment.${getImageExtension(type)}`, { type });
  } catch {
    return undefined;
  }
};

const canShareImageFile = (file: File): boolean => {
  try {
    return Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
};

export const shareFragment = async (fragment: Fragment): Promise<ShareFragmentResult> => {
  const title = fragment.title.trim() || "채집가방 조각";
  const text = getFragmentShareText(fragment);

  if (canUseNativeShare()) {
    const nativeShareData: ShareData = { title, text };
    const imageFile = fragment.imageKey || fragment.imageDataUrl
      ? await getFragmentImageFile(fragment)
      : undefined;
    const canShareImage = imageFile ? canShareImageFile(imageFile) : false;

    if (imageFile && canShareImage) {
      const textCopyPromise = copyShareText(text);
      try {
        await navigator.share({ ...nativeShareData, files: [imageFile] });
        return (await textCopyPromise) ? "shared-and-copied" : "shared";
      } catch (error) {
        if (isCanceledShareError(error)) return "canceled";
      }
    }

    try {
      await navigator.share(nativeShareData);
      return "shared";
    } catch (error) {
      if (isCanceledShareError(error)) return "canceled";
    }
  }

  return copyFragmentShareText(fragment);
};
