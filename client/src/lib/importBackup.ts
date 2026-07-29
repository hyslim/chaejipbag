import { MAX_FRAGMENT_IMAGE_ATTACHMENTS, normalizeFragmentTimestamps, type Fragment, type FragmentAttachment } from "@/data/fragments";
import { dataUrlToBlob, replaceAllImages, type StoredImageInput } from "@/data/imageStore";
import type { ChaejipbagBackup } from "@/lib/exportBackup";

const STORAGE_KEY = "chaejip-fragments";
const MAX_FILE_BYTES = 150 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 100 * 1024 * 1024;
const SAFE_ID = /^[^\s\x00-\x1f]{1,256}$/;
const IMAGE_DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/]+={0,2})$/i;

export class BackupValidationError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = "BackupValidationError";
  }
}

export type ValidatedBackup = {
  backup: ChaejipbagBackup;
  fragments: Fragment[];
  images: StoredImageInput[];
};

function reject(message: string): never {
  throw new BackupValidationError(message);
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) reject(message);
  return value as Record<string, unknown>;
}

const isSafeId = (value: unknown): value is string =>
  typeof value === "string" && SAFE_ID.test(value);

function inspectImageDataUrl(value: unknown): { mimeType: string; sizeBytes: number } {
  if (typeof value !== "string") reject("이미지 데이터가 올바르지 않은 백업이에요.");
  const match = value.match(IMAGE_DATA_URL);
  if (!match || match[2].length % 4 !== 0) reject("손상된 이미지가 들어 있는 백업이에요.");
  const base64 = match[2];
  const sizeBytes = Math.floor((base64.length * 3) / 4)
    - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (sizeBytes > MAX_IMAGE_BYTES) reject("한 장의 이미지가 너무 커서 안전하게 복원할 수 없어요.");
  return { mimeType: match[1].toLowerCase(), sizeBytes };
}

function normalizeAttachment(raw: unknown): FragmentAttachment {
  const value = requireRecord(raw, "첨부 이미지 정보가 올바르지 않은 백업이에요.");
  if (!isSafeId(value.id) || !isSafeId(value.blobKey)) reject("첨부 이미지 식별자가 올바르지 않은 백업이에요.");
  if (value.kind !== "image") reject("지원하지 않는 첨부 파일이 들어 있는 백업이에요.");
  if (typeof value.mimeType !== "string" || !value.mimeType.startsWith("image/")) reject("첨부 이미지 형식이 올바르지 않은 백업이에요.");
  if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) reject("첨부 이미지 날짜가 올바르지 않은 백업이에요.");
  if (value.filename !== undefined && typeof value.filename !== "string") reject("첨부 이미지 파일명이 올바르지 않은 백업이에요.");
  for (const field of ["sizeBytes", "width", "height"] as const) {
    if (value[field] !== undefined && (typeof value[field] !== "number" || !Number.isFinite(value[field]) || value[field] < 0)) {
      reject("첨부 이미지 크기 정보가 올바르지 않은 백업이에요.");
    }
  }
  return {
    ...(value as unknown as FragmentAttachment),
    id: value.id,
    blobKey: value.blobKey,
    kind: "image",
    mimeType: value.mimeType,
    createdAt: new Date(value.createdAt).toISOString(),
  };
}

function normalizeFragment(raw: unknown, index: number): Fragment {
  const value = requireRecord(raw, "조각 정보가 올바르지 않은 백업이에요.");
  if (!isSafeId(value.id)) reject("조각 식별자가 올바르지 않은 백업이에요.");
  if (typeof value.title !== "string" || !Array.isArray(value.pokachips)) reject("필수 조각 정보가 빠진 백업이에요.");
  if (!value.pokachips.every((item: unknown) => typeof item === "string")) reject("포카칩 정보가 올바르지 않은 백업이에요.");
  for (const field of ["memo", "source", "url", "time", "date", "thumbnailColor"] as const) {
    if (value[field] !== undefined && typeof value[field] !== "string") reject("조각 내용이 올바르지 않은 백업이에요.");
  }
  for (const field of ["createdAt", "updatedAt", "pinnedAt"] as const) {
    if (value[field] !== undefined && (typeof value[field] !== "string" || !Number.isFinite(Date.parse(value[field])))) {
      reject("조각 날짜가 올바르지 않은 백업이에요.");
    }
  }
  if (value.sourceType !== undefined && !["link", "text", "youtube"].includes(value.sourceType as string)) {
    reject("조각 출처 정보가 올바르지 않은 백업이에요.");
  }
  if (value.imageKey !== undefined && !isSafeId(value.imageKey)) reject("기존 이미지 식별자가 올바르지 않은 백업이에요.");
  if (value.imageDataUrl !== undefined && typeof value.imageDataUrl !== "string") reject("기존 이미지 데이터가 올바르지 않은 백업이에요.");
  if (value.linkMetadata !== undefined) {
    const metadata = requireRecord(value.linkMetadata, "링크 정보가 올바르지 않은 백업이에요.");
    for (const field of ["canonicalUrl", "provider", "contentType", "fetchedAt"] as const) {
      if (typeof metadata[field] !== "string") reject("링크 정보가 올바르지 않은 백업이에요.");
    }
    for (const field of ["title", "description", "imageUrl", "siteName"] as const) {
      if (metadata[field] !== undefined && typeof metadata[field] !== "string") reject("링크 정보가 올바르지 않은 백업이에요.");
    }
    if (!Number.isFinite(Date.parse(metadata.fetchedAt as string))) reject("링크를 가져온 날짜가 올바르지 않은 백업이에요.");
  }
  if (value.attachments !== undefined && !Array.isArray(value.attachments)) reject("첨부 이미지 목록이 올바르지 않은 백업이에요.");
  if (Array.isArray(value.attachments) && value.attachments.length > MAX_FRAGMENT_IMAGE_ATTACHMENTS) reject("조각 하나에 이미지가 5장보다 많이 들어 있는 백업이에요.");

  return normalizeFragmentTimestamps({
    ...(value as unknown as Fragment),
    id: value.id,
    title: value.title,
    pokachips: [...value.pokachips] as string[],
    time: typeof value.time === "string" ? value.time : "",
    date: typeof value.date === "string" ? value.date : "",
    thumbnailColor: typeof value.thumbnailColor === "string" ? value.thumbnailColor : "",
    ...(Array.isArray(value.attachments) ? { attachments: value.attachments.map(normalizeAttachment) } : {}),
  }, index);
}

function addLegacyInlineImage(fragment: Fragment, dataUrls: Record<string, string>): Fragment {
  if (!fragment.imageDataUrl) return fragment;
  const inspected = inspectImageDataUrl(fragment.imageDataUrl);
  const firstAttachment = fragment.attachments?.[0];
  if (firstAttachment) {
    dataUrls[firstAttachment.blobKey] ??= fragment.imageDataUrl;
    return fragment;
  }
  const blobKey = isSafeId(fragment.imageKey) ? fragment.imageKey : `legacy-inline-${fragment.id}`;
  const attachment: FragmentAttachment = {
    id: `legacy-inline-${fragment.id}`,
    kind: "image",
    blobKey,
    mimeType: inspected.mimeType,
    createdAt: fragment.createdAt ?? new Date(0).toISOString(),
  };
  dataUrls[blobKey] = fragment.imageDataUrl;
  return { ...fragment, attachments: [attachment] };
}

export async function validateChaejipbagBackup(raw: unknown, fileSizeBytes = 0): Promise<ValidatedBackup> {
  if (fileSizeBytes > MAX_FILE_BYTES) reject("백업 파일이 너무 커서 이 기기에서 안전하게 열 수 없어요.");
  const value = requireRecord(raw, "채집가방에서 만든 백업 파일이 아니에요.");
  if (value.format !== "chaejipbag-backup") reject("채집가방에서 만든 백업 파일이 아니에요.");
  if (value.version !== 1) reject("이 버전의 앱에서 열 수 없는 백업이에요.");
  if (typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt))) reject("백업을 만든 날짜 정보가 올바르지 않아요.");
  if (!Array.isArray(value.fragments)) reject("조각 목록이 올바르지 않은 백업이에요.");
  if (value.images !== undefined && !Array.isArray(value.images)) reject("이미지 목록이 올바르지 않은 백업이에요.");
  if (Array.isArray(value.images) && value.images.length > 0) reject("이 백업의 이미지 구조는 현재 앱에서 열 수 없어요.");
  if (value.attachmentDataUrls !== undefined && (!value.attachmentDataUrls || typeof value.attachmentDataUrls !== "object" || Array.isArray(value.attachmentDataUrls))) reject("이미지 목록이 올바르지 않은 백업이에요.");

  const dataUrls = { ...((value.attachmentDataUrls as Record<string, string> | undefined) ?? {}) };
  const fragments = value.fragments
    .map((fragment, index) => normalizeFragment(fragment, index))
    .map((fragment) => addLegacyInlineImage(fragment, dataUrls));
  const fragmentIds = new Set<string>();
  const attachmentIds = new Set<string>();
  const blobKeys = new Set<string>();

  for (const fragment of fragments) {
    if (fragmentIds.has(fragment.id)) reject("같은 조각이 두 번 들어 있는 백업이에요.");
    fragmentIds.add(fragment.id);
    for (const attachment of fragment.attachments ?? []) {
      if (attachmentIds.has(attachment.id)) reject("같은 첨부 이미지가 두 번 들어 있는 백업이에요.");
      if (blobKeys.has(attachment.blobKey)) reject("같은 이미지 저장 위치가 두 번 사용된 백업이에요.");
      attachmentIds.add(attachment.id);
      blobKeys.add(attachment.blobKey);
    }
  }
  for (const key of Object.keys(dataUrls)) {
    if (!isSafeId(key)) reject("이미지 식별자가 올바르지 않은 백업이에요.");
    if (!blobKeys.has(key)) reject("연결된 조각이 없는 이미지가 들어 있는 백업이에요.");
  }
  for (const key of blobKeys) {
    if (!(key in dataUrls)) reject("첨부 이미지가 빠진 백업이라 복원할 수 없어요.");
  }

  const attachments = fragments.flatMap((fragment) => fragment.attachments ?? []);
  const images: StoredImageInput[] = [];
  let totalImageBytes = 0;
  for (const key of blobKeys) {
    const inspected = inspectImageDataUrl(dataUrls[key]);
    totalImageBytes += inspected.sizeBytes;
    if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) reject("이미지가 너무 많거나 커서 이 기기에서 안전하게 복원할 수 없어요.");
    const blob = await dataUrlToBlob(dataUrls[key]).catch(() => reject("손상된 이미지가 들어 있는 백업이에요."));
    if (!blob.type.startsWith("image/") || blob.type !== inspected.mimeType || blob.size !== inspected.sizeBytes) reject("손상된 이미지가 들어 있는 백업이에요.");
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        bitmap.close();
      } catch {
        reject("손상된 이미지가 들어 있는 백업이에요.");
      }
    }
    const attachment = attachments.find((item) => item.blobKey === key)!;
    if (attachment.mimeType !== "image/*" && attachment.mimeType !== blob.type) reject("이미지 형식 정보가 서로 맞지 않는 백업이에요.");
    images.push({ key, blob, createdAt: attachment.createdAt });
  }

  return { backup: value as unknown as ChaejipbagBackup, fragments, images };
}

export async function parseAndValidateBackupFile(file: File): Promise<ValidatedBackup> {
  if (file.size === 0) reject("내용이 없는 파일이에요.");
  if (file.size > MAX_FILE_BYTES) reject("백업 파일이 너무 커서 이 기기에서 안전하게 열 수 없어요.");
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    reject("파일을 읽을 수 없어요. 온전한 채집가방 백업인지 확인해 주세요.");
  }
  return validateChaejipbagBackup(raw, file.size);
}

type BackupStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type ImageReplacer = (images: StoredImageInput[], commitFragments: () => void) => Promise<void>;

export async function restoreBackupWithAdapters(
  validated: ValidatedBackup,
  replaceImages: ImageReplacer,
  storage: BackupStorage
): Promise<void> {
  const previous = storage.getItem(STORAGE_KEY);
  let fragmentsWritten = false;
  try {
    await replaceImages(validated.images, () => {
      storage.setItem(STORAGE_KEY, JSON.stringify(validated.fragments));
      fragmentsWritten = true;
    });
  } catch {
    if (fragmentsWritten) {
      if (previous === null) storage.removeItem(STORAGE_KEY);
      else storage.setItem(STORAGE_KEY, previous);
    }
    throw new BackupValidationError("복원하는 중 문제가 생겨 기존 가방을 그대로 유지했어요. 다시 시도해 주세요.");
  }
}

export async function restoreValidatedBackup(validated: ValidatedBackup): Promise<void> {
  return restoreBackupWithAdapters(validated, replaceAllImages, localStorage);
}
