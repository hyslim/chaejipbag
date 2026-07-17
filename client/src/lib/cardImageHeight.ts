export type CardImageHeight = 160 | 200 | 240;

export const getCardImageHeight = (
  naturalWidth: number,
  naturalHeight: number
): CardImageHeight => {
  if (naturalWidth <= 0 || naturalHeight <= 0) return 200;

  const ratio = naturalWidth / naturalHeight;
  if (ratio >= 1.3) return 160;
  if (ratio >= 0.8) return 200;
  return 240;
};
