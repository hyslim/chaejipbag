export type QuickSaveNavigate = (
  path: string,
  options?: { replace?: boolean }
) => void;

export const navigateAfterSuccessfulQuickSave = (
  navigate: QuickSaveNavigate
): void => {
  navigate("/", { replace: true });
};
