const SHARE_CACHE = "chaejip-share-target-v1";
const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.8;
const MAX_PROCESSED_IMAGE_SIZE_BYTES = 1.5 * 1024 * 1024;
const MAX_SOURCE_IMAGE_SIZE_BYTES = 30 * 1024 * 1024;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const getFormValue = (formData, key) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const getFirstImageFile = (formData) => {
  const candidates = [
    ...formData.getAll("image"),
    ...formData.getAll("images"),
    ...formData.getAll("file"),
    ...formData.getAll("files"),
  ];

  return candidates.find((value) => value instanceof File && value.type.startsWith("image/"));
};

const fileToDataUrl = async (file) => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return `data:${file.type || "image/jpeg"};base64,${btoa(binary)}`;
};

const getProcessedImageType = (sourceType) => {
  // PNG may contain transparency, so keep it lossless instead of flattening it.
  if (sourceType === "image/png") return "image/png";
  return "image/webp";
};

const resizeImage = async (file) => {
  if (
    typeof createImageBitmap !== "function" ||
    typeof OffscreenCanvas !== "function"
  ) {
    throw new Error("Image resizing is not supported");
  }

  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context is not available");

    context.drawImage(bitmap, 0, 0, width, height);

    const type = getProcessedImageType(file.type);
    const blob = await canvas.convertToBlob({
      type,
      ...(type === "image/png" ? {} : { quality: IMAGE_QUALITY }),
    });

    if (!blob.size || blob.size > MAX_PROCESSED_IMAGE_SIZE_BYTES) {
      throw new Error("Processed image is too large");
    }

    return fileToDataUrl(blob);
  } finally {
    bitmap.close();
  }
};

const cleanupOldPayloads = async (cache) => {
  const requests = await cache.keys();
  const now = Date.now();

  await Promise.all(
    requests.map(async (request) => {
      const response = await cache.match(request);
      const storedAt = Number(response?.headers.get("x-share-stored-at") || 0);
      if (!storedAt || now - storedAt > 30 * 60 * 1000) {
        await cache.delete(request);
      }
    })
  );
};

const storePayload = async (payload) => {
  const cache = await caches.open(SHARE_CACHE);
  await cleanupOldPayloads(cache);

  const shareId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const response = new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-share-stored-at": String(Date.now()),
    },
  });

  await cache.put(`/share-target-payloads/${shareId}`, response);
  return shareId;
};

const handleQuickSavePost = async (request) => {
  const formData = await request.formData();
  const imageFile = getFirstImageFile(formData);
  const payload = {
    title: getFormValue(formData, "title"),
    text: getFormValue(formData, "text"),
    url: getFormValue(formData, "url"),
    imageDataUrl: "",
    imageError: "",
  };

  if (imageFile) {
    if (imageFile.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
      payload.imageError = "이미지가 커서 이미지 없이 열었어요.";
    } else {
      try {
        payload.imageDataUrl = await resizeImage(imageFile);
      } catch {
        payload.imageError = "이미지를 저장용으로 줄일 수 없어 이미지 없이 열었어요.";
      }
    }
  }

  const shareId = await storePayload(payload);
  return Response.redirect(`/quick-save?shareId=${encodeURIComponent(shareId)}`, 303);
};

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.origin === self.location.origin && url.pathname === "/quick-save") {
    event.respondWith(handleQuickSavePost(event.request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/share-target-payloads/")) {
    event.respondWith((async () => {
      const cache = await caches.open(SHARE_CACHE);

      if (event.request.method === "DELETE") {
        await cache.delete(url.pathname);
        return new Response(null, { status: 204 });
      }

      const response = await cache.match(url.pathname);
      return response || new Response(null, { status: 404 });
    })());
  }
});
