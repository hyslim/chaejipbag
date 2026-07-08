const SHARE_CACHE = "chaejip-share-target-v1";
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

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
    if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      payload.imageError = "이미지가 2MB를 넘어 이미지 없이 열었어요.";
    } else {
      try {
        payload.imageDataUrl = await fileToDataUrl(imageFile);
      } catch {
        payload.imageError = "이미지를 불러오지 못했어요.";
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
