import { useState, useEffect, useCallback } from "react";
import { deleteImage, saveImageAttachment } from "@/data/imageStore";
import {
  MAX_FRAGMENT_IMAGE_ATTACHMENTS,
  getFallbackCreatedAt,
  getFragmentImageAttachments,
  normalizeFragmentTimestamps,
  normalizeSavedPokachips,
  sampleFragments,
  type Fragment,
  type FragmentAttachment,
} from "@/data/fragments";

const STORAGE_KEY = "chaejip-fragments";

export type ImageAttachmentInput = {
  dataUrl: string;
  filename?: string;
};

const normalizeImageInputs = (
  images: Array<ImageAttachmentInput | string>
): ImageAttachmentInput[] =>
  images.slice(0, MAX_FRAGMENT_IMAGE_ATTACHMENTS).map((image) =>
    typeof image === "string" ? { dataUrl: image } : image
  );

function loadFromStorage(): Fragment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as Fragment[]).map(normalizeFragmentTimestamps);
  } catch {
    // ignore parse errors
  }
  return sampleFragments.map(normalizeFragmentTimestamps);
}

function saveToStorage(fragments: Fragment[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fragments));
    return true;
  } catch {
    return false;
  }
}

const deleteAttachments = async (attachments: FragmentAttachment[]): Promise<void> => {
  await Promise.all(attachments.map((attachment) =>
    deleteImage(attachment.blobKey).catch(() => undefined)
  ));
};

export function useFragments() {
  const [fragments, setFragments] = useState<Fragment[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(fragments);
  }, [fragments]);

  const getFragment = useCallback(
    (id: string) => fragments.find((fragment) => fragment.id === id),
    [fragments]
  );

  const updateFragment = useCallback((id: string, patch: Partial<Fragment>) => {
    const targetIndex = fragments.findIndex((fragment) => fragment.id === id);
    const targetFragment = targetIndex >= 0 ? fragments[targetIndex] : undefined;
    if (!targetFragment) return null;

    const updatedFragment: Fragment = {
      ...targetFragment,
      ...patch,
      ...(patch.pokachips ? { pokachips: normalizeSavedPokachips(patch.pokachips) } : {}),
      createdAt: targetFragment.createdAt ?? getFallbackCreatedAt(targetFragment, targetIndex),
      updatedAt: new Date().toISOString(),
    };
    const nextFragments = fragments.map((fragment, index) =>
      index === targetIndex ? updatedFragment : fragment
    );

    if (!saveToStorage(nextFragments)) return null;
    setFragments(nextFragments);
    return updatedFragment;
  }, [fragments]);

  const toggleFragmentPin = useCallback((id: string) => {
    const targetIndex = fragments.findIndex((fragment) => fragment.id === id);
    const targetFragment = targetIndex >= 0 ? fragments[targetIndex] : undefined;
    if (!targetFragment) return null;

    const updatedFragment: Fragment = { ...targetFragment };
    if (updatedFragment.pinnedAt) {
      delete updatedFragment.pinnedAt;
    } else {
      updatedFragment.pinnedAt = new Date().toISOString();
    }

    const nextFragments = fragments.map((fragment, index) =>
      index === targetIndex ? updatedFragment : fragment
    );

    if (!saveToStorage(nextFragments)) return null;
    setFragments(nextFragments);
    return updatedFragment;
  }, [fragments]);

  const addFragment = useCallback((fragment: Omit<Fragment, "id">) => {
    const now = new Date().toISOString();
    const newFragment: Fragment = {
      ...fragment,
      pokachips: normalizeSavedPokachips(fragment.pokachips),
      id: typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    const nextFragments = [newFragment, ...fragments];

    if (!saveToStorage(nextFragments)) return null;
    setFragments(nextFragments);
    return newFragment;
  }, [fragments]);

  const addFragmentWithImages = useCallback(async (
    fragment: Omit<Fragment, "id" | "attachments" | "imageKey" | "imageDataUrl">,
    images: Array<ImageAttachmentInput | string>
  ) => {
    const savedAttachments: FragmentAttachment[] = [];

    try {
      for (const image of normalizeImageInputs(images)) {
        savedAttachments.push(await saveImageAttachment(image.dataUrl, image.filename));
      }

      const savedFragment = addFragment({ ...fragment, attachments: savedAttachments });
      if (!savedFragment) {
        await deleteAttachments(savedAttachments);
        return null;
      }
      return savedFragment;
    } catch {
      await deleteAttachments(savedAttachments);
      return null;
    }
  }, [addFragment]);

  const addFragmentWithImage = useCallback((
    fragment: Omit<Fragment, "id" | "attachments" | "imageKey" | "imageDataUrl">,
    imageDataUrl: string
  ) => addFragmentWithImages(fragment, [imageDataUrl]), [addFragmentWithImages]);

  const updateFragmentImages = useCallback(async (
    id: string,
    patch: Partial<Fragment>,
    keptAttachmentIds: string[],
    newImages: Array<ImageAttachmentInput | string>
  ) => {
    const targetFragment = fragments.find((fragment) => fragment.id === id);
    if (!targetFragment) return null;

    const currentAttachments = getFragmentImageAttachments(targetFragment);
    const otherAttachments = (targetFragment.attachments ?? []).filter((attachment) => attachment.kind !== "image");
    const keepIds = new Set(keptAttachmentIds);
    const keptAttachments = currentAttachments.filter((attachment) => keepIds.has(attachment.id));
    const removedAttachments = currentAttachments.filter((attachment) => !keepIds.has(attachment.id));
    const newAttachments: FragmentAttachment[] = [];

    try {
      if (
        keepIds.has("legacy-data-url")
        && targetFragment.imageDataUrl
        && keptAttachments.length < MAX_FRAGMENT_IMAGE_ATTACHMENTS
      ) {
        newAttachments.push(await saveImageAttachment(targetFragment.imageDataUrl));
      }

      const availableSlots = MAX_FRAGMENT_IMAGE_ATTACHMENTS - keptAttachments.length - newAttachments.length;
      for (const image of normalizeImageInputs(newImages).slice(0, Math.max(0, availableSlots))) {
        newAttachments.push(await saveImageAttachment(image.dataUrl, image.filename));
      }

      const updatedFragment = updateFragment(id, {
        ...patch,
        attachments: [...otherAttachments, ...keptAttachments, ...newAttachments],
        imageKey: undefined,
        imageDataUrl: undefined,
      });

      if (!updatedFragment) {
        await deleteAttachments(newAttachments);
        return null;
      }

      await deleteAttachments(removedAttachments);
      return updatedFragment;
    } catch {
      await deleteAttachments(newAttachments);
      return null;
    }
  }, [fragments, updateFragment]);

  const updateFragmentImage = useCallback(async (
    id: string,
    patch: Partial<Fragment>,
    nextImageDataUrl: string | null
  ) => updateFragmentImages(id, patch, [], nextImageDataUrl ? [nextImageDataUrl] : []),
  [updateFragmentImages]);

  const deleteFragment = useCallback((id: string) => {
    const targetFragment = fragments.find((fragment) => fragment.id === id);
    const nextFragments = fragments.filter((fragment) => fragment.id !== id);

    if (!saveToStorage(nextFragments)) return false;
    setFragments(nextFragments);

    if (targetFragment) {
      const attachments = getFragmentImageAttachments(targetFragment);
      void deleteAttachments(attachments);
    }
    return true;
  }, [fragments]);

  return {
    fragments,
    getFragment,
    updateFragment,
    toggleFragmentPin,
    updateFragmentImage,
    updateFragmentImages,
    addFragment,
    addFragmentWithImage,
    addFragmentWithImages,
    deleteFragment,
  };
}
