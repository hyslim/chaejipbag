import type { Fragment } from "@/data/fragments";
import { getImageBlob } from "@/data/imageStore";

export type ChaejipbagBackup = {
  format: "chaejipbag-backup";
  version: 1;
  exportedAt: string;
  fragmentCount: number;
  imageCount: number;
  imageFailureCount: number;
  fragments: Fragment[];
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not convert image data."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image data."));
    reader.readAsDataURL(blob);
  });

export const createChaejipbagBackup = async (
  fragments: Fragment[],
  exportedAt = new Date()
): Promise<ChaejipbagBackup> => {
  let imageCount = 0;
  let imageFailureCount = 0;

  const backupFragments = await Promise.all(
    fragments.map(async (fragment): Promise<Fragment> => {
      if (!fragment.imageKey) {
        if (fragment.imageDataUrl) imageCount += 1;
        return { ...fragment };
      }

      try {
        const imageBlob = await getImageBlob(fragment.imageKey);
        if (!imageBlob) throw new Error("Stored image was not found.");

        const imageDataUrl = await blobToDataUrl(imageBlob);
        imageCount += 1;
        return { ...fragment, imageDataUrl };
      } catch {
        imageFailureCount += 1;
        return { ...fragment };
      }
    })
  );

  return {
    format: "chaejipbag-backup",
    version: 1,
    exportedAt: exportedAt.toISOString(),
    fragmentCount: backupFragments.length,
    imageCount,
    imageFailureCount,
    fragments: backupFragments,
  };
};

const getBackupFileName = (exportedAt: string): string =>
  `chaejipbag-backup-${exportedAt.slice(0, 10)}.json`;

export const downloadChaejipbagBackup = async (
  fragments: Fragment[]
): Promise<ChaejipbagBackup> => {
  const backup = await createChaejipbagBackup(fragments);
  const file = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");

  try {
    link.href = objectUrl;
    link.download = getBackupFileName(backup.exportedAt);
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  return backup;
};
