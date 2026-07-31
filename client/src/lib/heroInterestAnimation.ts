export type HeroInterestAnimationItem = {
  key: string;
  count: number;
};

const HERO_INTEREST_THRESHOLD = 5;

export const getHeroInterestAnimationKeys = (
  interests: HeroInterestAnimationItem[],
  previousCounts: ReadonlyMap<string, number> | null,
  hasShownHero: boolean
): Set<string> => {
  if (!hasShownHero) {
    return new Set(interests.map(({ key }) => key));
  }

  if (!previousCounts) return new Set();

  return new Set(
    interests
      .filter(
        ({ key, count }) =>
          count >= HERO_INTEREST_THRESHOLD
          && (previousCounts.get(key) ?? 0) < HERO_INTEREST_THRESHOLD
      )
      .map(({ key }) => key)
  );
};
