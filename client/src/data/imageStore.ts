const DATABASE_NAME = "chaejip-images";
const DATABASE_VERSION = 1;
const STORE_NAME = "images";

type StoredImage = {
  key: string;
  blob: Blob;
  createdAt: string;
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("이미지 저장소를 열지 못했어요."));
  });

const completeTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("이미지 저장소 작업에 실패했어요."));
    transaction.onabort = () => reject(transaction.error ?? new Error("이미지 저장소 작업이 취소됐어요."));
  });

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("이미지 데이터를 읽지 못했어요.");
  return response.blob();
};

export const saveImage = async (dataUrl: string): Promise<string> => {
  const blob = await dataUrlToBlob(dataUrl);
  const database = await openDatabase();
  const key = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const image: StoredImage = {
      key,
      blob,
      createdAt: new Date().toISOString(),
    };
    transaction.objectStore(STORE_NAME).add(image);
    await completeTransaction(transaction);
    return key;
  } finally {
    database.close();
  }
};

export const getImageBlob = async (key: string): Promise<Blob | undefined> => {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const completion = completeTransaction(transaction);
    const request = transaction.objectStore(STORE_NAME).get(key);
    const image = await new Promise<StoredImage | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as StoredImage | undefined);
      request.onerror = () => reject(request.error ?? new Error("이미지를 읽지 못했어요."));
    });
    await completion;
    return image?.blob;
  } finally {
    database.close();
  }
};

export const deleteImage = async (key: string): Promise<void> => {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    await completeTransaction(transaction);
  } finally {
    database.close();
  }
};
