import { useState, useEffect, useCallback } from "react";
import { deleteImage, saveImage } from "@/data/imageStore";
import { getFallbackCreatedAt, normalizeFragmentTimestamps, normalizeSavedPokachips, sampleFragments, type Fragment } from "@/data/fragments";

const STORAGE_KEY = "chaejip-fragments";

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

export function useFragments() {
  const [fragments, setFragments] = useState<Fragment[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(fragments);
  }, [fragments]);

  const getFragment = useCallback(
    (id: string) => fragments.find((f) => f.id === id),
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

  const addFragmentWithImage = useCallback(async (
    fragment: Omit<Fragment, "id" | "imageKey" | "imageDataUrl">,
    imageDataUrl: string
  ) => {
    let imageKey: string | undefined;

    try {
      imageKey = await saveImage(imageDataUrl);
      const savedFragment = addFragment({ ...fragment, imageKey });
      if (!savedFragment) {
        await deleteImage(imageKey).catch(() => undefined);
        return null;
      }
      return savedFragment;
    } catch {
      if (imageKey) await deleteImage(imageKey).catch(() => undefined);
      return null;
    }
  }, [addFragment]);

  const updateFragmentImage = useCallback(async (
    id: string,
    patch: Partial<Fragment>,
    nextImageDataUrl: string | null
  ) => {
    const targetFragment = fragments.find((fragment) => fragment.id === id);
    if (!targetFragment) return null;

    let nextImageKey: string | undefined;

    try {
      if (nextImageDataUrl) nextImageKey = await saveImage(nextImageDataUrl);
      const updatedFragment = updateFragment(id, {
        ...patch,
        imageKey: nextImageKey,
        imageDataUrl: undefined,
      });

      if (!updatedFragment) {
        if (nextImageKey) await deleteImage(nextImageKey).catch(() => undefined);
        return null;
      }

      if (targetFragment.imageKey && targetFragment.imageKey !== nextImageKey) {
        await deleteImage(targetFragment.imageKey).catch(() => undefined);
      }
      return updatedFragment;
    } catch {
      if (nextImageKey) await deleteImage(nextImageKey).catch(() => undefined);
      return null;
    }
  }, [fragments, updateFragment]);

  const deleteFragment = useCallback((id: string) => {
    const targetFragment = fragments.find((fragment) => fragment.id === id);
    const nextFragments = fragments.filter((fragment) => fragment.id !== id);

    if (!saveToStorage(nextFragments)) return false;
    setFragments(nextFragments);
    if (targetFragment?.imageKey) {
      void deleteImage(targetFragment.imageKey).catch(() => undefined);
    }
    return true;
  }, [fragments]);

  return {
    fragments,
    getFragment,
    updateFragment,
    updateFragmentImage,
    addFragment,
    addFragmentWithImage,
    deleteFragment,
  };
}
