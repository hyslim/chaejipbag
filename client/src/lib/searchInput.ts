export type SearchConfirmationKey = {
  key: string;
  isComposing?: boolean;
  keyCode?: number;
};

export function isSearchConfirmationKey(event: SearchConfirmationKey): boolean {
  return event.key === "Enter"
    && !event.isComposing
    && event.keyCode !== 229;
}
