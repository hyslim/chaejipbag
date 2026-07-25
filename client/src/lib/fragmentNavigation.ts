const NAVIGATION_STORAGE_PREFIX = "chaejip-fragment-navigation:";
const MAX_NAVIGATION_IDS = 2000;

export type FragmentNavigationSource =
  | "home"
  | "home-filter"
  | "home-search"
  | "search"
  | "history";

export interface FragmentNavigationContext {
  version: 1;
  token: string;
  source: FragmentNavigationSource;
  fragmentIds: string[];
  currentId: string;
  returnTo: string;
  createdAt: number;
}

const getStorageKey = (token: string) => `${NAVIGATION_STORAGE_PREFIX}${token}`;

const getSafeReturnTo = (returnTo: string): string =>
  returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

const getUniqueIds = (fragmentIds: string[]): string[] =>
  Array.from(new Set(fragmentIds.filter((id) => typeof id === "string" && id.length > 0)))
    .slice(0, MAX_NAVIGATION_IDS);

const createToken = (): string =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function getFragmentNavigationToken(search = window.location.search): string | null {
  const token = new URLSearchParams(search).get("nav");
  return token && token.length <= 100 ? token : null;
}

export function getFragmentDetailPath(fragmentId: string, token?: string | null): string {
  const path = `/fragment/${encodeURIComponent(fragmentId)}`;
  return token ? `${path}?nav=${encodeURIComponent(token)}` : path;
}

export function createFragmentNavigationPath({
  fragmentId,
  fragmentIds,
  returnTo,
  source,
}: {
  fragmentId: string;
  fragmentIds: string[];
  returnTo: string;
  source: FragmentNavigationSource;
}): string {
  const normalizedIds = getUniqueIds(fragmentIds);
  if (!normalizedIds.includes(fragmentId)) return getFragmentDetailPath(fragmentId);

  const token = createToken();
  const context: FragmentNavigationContext = {
    version: 1,
    token,
    source,
    fragmentIds: normalizedIds,
    currentId: fragmentId,
    returnTo: getSafeReturnTo(returnTo),
    createdAt: Date.now(),
  };

  try {
    sessionStorage.setItem(getStorageKey(token), JSON.stringify(context));
    return getFragmentDetailPath(fragmentId, token);
  } catch {
    return getFragmentDetailPath(fragmentId);
  }
}

export function readFragmentNavigationContext(
  token: string | null
): FragmentNavigationContext | null {
  if (!token) return null;

  try {
    const parsed = JSON.parse(sessionStorage.getItem(getStorageKey(token)) ?? "null") as
      | Partial<FragmentNavigationContext>
      | null;
    if (
      !parsed
      || parsed.version !== 1
      || parsed.token !== token
      || !Array.isArray(parsed.fragmentIds)
      || typeof parsed.currentId !== "string"
      || typeof parsed.returnTo !== "string"
      || typeof parsed.source !== "string"
      || typeof parsed.createdAt !== "number"
    ) {
      return null;
    }

    return {
      version: 1,
      token,
      source: parsed.source as FragmentNavigationSource,
      fragmentIds: getUniqueIds(parsed.fragmentIds),
      currentId: parsed.currentId,
      returnTo: getSafeReturnTo(parsed.returnTo),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function updateFragmentNavigationContext(
  context: FragmentNavigationContext,
  fragmentIds: string[],
  currentId: string
): FragmentNavigationContext {
  const updatedContext: FragmentNavigationContext = {
    ...context,
    fragmentIds: getUniqueIds(fragmentIds),
    currentId,
  };

  try {
    sessionStorage.setItem(getStorageKey(context.token), JSON.stringify(updatedContext));
  } catch {
    // Detail navigation still works for the current page when storage is unavailable.
  }

  return updatedContext;
}
