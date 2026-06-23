import { useState, useEffect, useCallback } from "react";
import { sampleFragments, type Fragment } from "@/data/fragments";

const STORAGE_KEY = "chaejip-fragments";

function loadFromStorage(): Fragment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Fragment[];
  } catch {
    // ignore parse errors
  }
  return sampleFragments;
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
    const targetFragment = fragments.find((fragment) => fragment.id === id);
    const nextFragments = targetFragment
      ? [
          { ...targetFragment, ...patch },
          ...fragments.filter((fragment) => fragment.id !== id),
        ]
      : fragments.map((fragment) =>
          fragment.id === id ? { ...fragment, ...patch } : fragment
        );

    saveToStorage(nextFragments);
    setFragments(nextFragments);
  }, [fragments]);

  const addFragment = useCallback((fragment: Omit<Fragment, "id">) => {
    const newFragment: Fragment = {
      ...fragment,
      id: typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
