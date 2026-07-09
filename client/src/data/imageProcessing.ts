const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.8;
const MAX_PROCESSED_IMAGE_SIZE_BYTES = 1.5 * 1024 * 1024;
const MAX_SOURCE_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("이미지를 압축하지 못했어요."));
      },
      type,
      quality
    );
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("이미지 미리보기를 만들지 못했어요."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(blob);
  });

export const processSelectedImage = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일을 선택해주세요.");
  }
  if (file.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
    throw new Error("이미지가 너무 커서 처리하지 못했어요.");
  }

  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리하지 못했어요.");
    context.drawImage(bitmap, 0, 0, width, height);

    const keepsTransparency = file.type === "image/png";
    const blob = await canvasToBlob(
      canvas,
      keepsTransparency ? "image/png" : "image/webp",
      keepsTransparency ? undefined : IMAGE_QUALITY
    );

    if (!blob.size || blob.size > MAX_PROCESSED_IMAGE_SIZE_BYTES) {
      throw new Error("압축한 이미지도 너무 커서 추가하지 못했어요.");
    }

    return blobToDataUrl(blob);
  } finally {
    bitmap.close();
  }
};
