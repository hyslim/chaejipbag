import { useEffect, useState } from "react";
import type { Fragment } from "@/data/fragments";
import { getImageBlob } from "@/data/imageStore";

export const useFragmentImage = (fragment?: Pick<Fragment, "imageKey" | "imageDataUrl">) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(fragment?.imageDataUrl);

  useEffect(() => {
    let isCanceled = false;
    let objectUrl: string | undefined;

    setImageUrl(fragment?.imageDataUrl);

    if (fragment?.imageKey) {
      void getImageBlob(fragment.imageKey)
        .then((blob) => {
          if (!blob || isCanceled) return;
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        })
        .catch(() => {
          if (!isCanceled) setImageUrl(fragment.imageDataUrl);
        });
    }

    return () => {
      isCanceled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fragment?.imageDataUrl, fragment?.imageKey]);

  return imageUrl;
};
