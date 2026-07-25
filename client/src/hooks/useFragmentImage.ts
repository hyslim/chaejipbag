import { useEffect, useMemo, useState } from "react";
import { getFragmentImageAttachments, type Fragment } from "@/data/fragments";
import { getImageBlob } from "@/data/imageStore";

export type FragmentImageSource = {
  id: string;
  url: string;
};

export const useFragmentImages = (
  fragment?: Pick<Fragment, "attachments" | "imageKey" | "imageDataUrl" | "createdAt" | "updatedAt">
): FragmentImageSource[] => {
  const attachments = useMemo(
    () => getFragmentImageAttachments(fragment),
    [fragment?.attachments, fragment?.imageKey, fragment?.createdAt, fragment?.updatedAt]
  );
  const [imageSources, setImageSources] = useState<FragmentImageSource[]>(
    fragment?.imageDataUrl && attachments.length === 0
      ? [{ id: "legacy-data-url", url: fragment.imageDataUrl }]
      : []
  );

  useEffect(() => {
    let isCanceled = false;
    const objectUrls: string[] = [];

    if (attachments.length === 0) {
      setImageSources(
        fragment?.imageDataUrl
          ? [{ id: "legacy-data-url", url: fragment.imageDataUrl }]
          : []
      );
      return () => {
        isCanceled = true;
      };
    }

    setImageSources([]);
    void Promise.all(
      attachments.map(async (attachment): Promise<FragmentImageSource | undefined> => {
        try {
          const blob = await getImageBlob(attachment.blobKey);
          if (!blob || isCanceled) return undefined;
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          return { id: attachment.id, url };
        } catch {
          return undefined;
        }
      })
    ).then((sources) => {
      if (!isCanceled) setImageSources(sources.filter((source): source is FragmentImageSource => Boolean(source)));
    });

    return () => {
      isCanceled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [attachments, fragment?.imageDataUrl]);

  return imageSources;
};

export const useFragmentImage = (
  fragment?: Pick<Fragment, "attachments" | "imageKey" | "imageDataUrl" | "createdAt" | "updatedAt">
) => useFragmentImages(fragment)[0]?.url;
