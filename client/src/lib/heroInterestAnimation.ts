export type HeroInterestAnimationItem = {
  key: string;
};

export const getHeroInterestAnimationKeys = (
  interests: HeroInterestAnimationItem[],
  previousHeroKeys: ReadonlySet<string>,
  hasShownHero: boolean,
  pendingHeroKeys: ReadonlySet<string> = new Set()
): Set<string> => {
  const currentKeys = new Set(interests.map(({ key }) => key));
  const animationKeys = new Set<string>();

  interests.forEach(({ key }) => {
    if (!hasShownHero || !previousHeroKeys.has(key)) animationKeys.add(key);
  });
  pendingHeroKeys.forEach((key) => {
    if (currentKeys.has(key)) animationKeys.add(key);
  });

  return animationKeys;
};
