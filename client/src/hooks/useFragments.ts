import { useState, useEffect, useCallback } from "react";
import { getFallbackCreatedAt, normalizeFragmentTimestamps, sampleFragments, type Fragment } from "@/data/fragments";

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

function saveToStorage(fragments: Fragment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fragments));
  } catch {
    // ignore storage errors
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
    const now = new Date().toISOString();
    const nextFragments = targetFragment
      ? [
          {
            ...targetFragment,
            ...patch,
            createdAt: targetFragment.createdAt ?? getFallbackCreatedAt(targetFragment, targetIndex),
            updatedAt: now,
          },
          ...fragments.filter((fragment) => fragment.id !== id),
        ]
      : fragments.map((fragment) =>
          fragment.id === id ? { ...fragment, ...patch } : fragment
        );

    saveToStorage(nextFragments);
    setFragments(nextFragments);
  }, [fragments]);

  const addFragment = useCallback((fragment: Omit<Fragment, "id">) => {
    const now = new Date().toISOString();
    const newFragment: Fragment = {
      ...fragment,
      id: typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    const nextFragments = [newFragment, ...fragments];

    saveToStorage(nextFragments);
    setFragments(nextFragments);

    return newFragment;
  }, [fragments]);

  const deleteFragment = useCallback((id: string) => {
    const nextFragments = fragments.filter((fragment) => fragment.id !== id);

    saveToStorage(nextFragments);
    setFragments(nextFragments);
  }, [fragments]);

  return { fragments, getFragment, updateFragment, addFragment, deleteFragment };
}
