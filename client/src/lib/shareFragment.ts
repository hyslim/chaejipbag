import {
  getFragmentImageAttachments,
  getFragmentImageCount,
  type Fragment,
  type FragmentAttachment,
} from "@/data/fragments";
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
  getFragmentImageCount(fragment) > 0;

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

const getAttachmentFile = async (
  attachment: FragmentAttachment,
  index: number
): Promise<File | undefined> => {
  try {
    const blob = await getImageBlob(attachment.blobKey);
    if (!blob) return undefined;
    const type = blob.type || attachment.mimeType || "image/jpeg";
    const filename = attachment.filename?.trim()
      || `chaejipbag-fragment-${index + 1}.${getImageExtension(type)}`;
    return new File([blob], filename, { type });
  } catch {
    return undefined;
  }
};

const getFragmentImageFiles = async (fragment: Fragment): Promise<File[]> => {
  const attachments = getFragmentImageAttachments(fragment);
  const files = (await Promise.all(
    attachments.map((attachment, index) => getAttachmentFile(attachment, index))
  )).filter((file): file is File => Boolean(file));

  if (files.length > 0 || !fragment.imageDataUrl) return files;

  try {
    const blob = await dataUrlToBlob(fragment.imageDataUrl);
    const type = blob.type || "image/jpeg";
    return [new File(
      [blob],
      `chaejipbag-fragment-1.${getImageExtension(type)}`,
      { type }
    )];
  } catch {
    return [];
  }
};

const canShareImageFiles = (files: File[]): boolean => {
  if (files.length === 0) return false;
  try {
    return Boolean(navigator.canShare?.({ files }));
  } catch {
    return false;
  }
};

export const shareFragment = async (fragment: Fragment): Promise<ShareFragmentResult> => {
  const title = fragment.title.trim() || "채집가방 조각";
  const text = getFragmentShareText(fragment);

  if (canUseNativeShare()) {
    const nativeShareData: ShareData = { title, text };
    const imageFiles = shouldOfferImageShare(fragment)
      ? await getFragmentImageFiles(fragment)
      : [];
    const shareableImageFiles = canShareImageFiles(imageFiles)
      ? imageFiles
      : imageFiles.length > 1 && canShareImageFiles([imageFiles[0]])
        ? [imageFiles[0]]
        : [];

    if (shareableImageFiles.length > 0) {
      const textCopyPromise = copyShareText(text);
      try {
        await navigator.share({ ...nativeShareData, files: shareableImageFiles });
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
