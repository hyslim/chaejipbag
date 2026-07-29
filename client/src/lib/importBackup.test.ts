import assert from "node:assert/strict";
import { File as NodeFile } from "node:buffer";
import test from "node:test";
import {
  BackupValidationError,
  parseAndValidateBackupFile,
  restoreBackupWithAdapters,
  validateChaejipbagBackup,
  type ValidatedBackup,
} from "./importBackup";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const exportedAt = "2026-07-29T03:00:00.000Z";
const makeFragment = (id: string, imageCount = 0) => ({
  id,
  title: `조각 ${id}`,
  memo: "날짜와 메모",
  pokachips: ["하나", "둘", "셋"],
  time: "오후 12:00",
  date: "2026. 7. 1.",
  createdAt: "2026-07-01T03:00:00.000Z",
  updatedAt: "2026-07-02T03:00:00.000Z",
  pinnedAt: id === "pinned" ? "2026-07-03T03:00:00.000Z" : undefined,
  thumbnailColor: "#fff",
  source: "직접 저장",
  sourceType: "text" as const,
  attachments: Array.from({ length: imageCount }, (_, index) => ({
    id: `${id}-attachment-${index}`,
    kind: "image" as const,
    blobKey: `${id}-blob-${index}`,
    mimeType: "image/png",
    filename: `${index}.png`,
    sizeBytes: 68,
    createdAt: "2026-07-01T03:00:00.000Z",
  })),
});

const makeBackup = () => {
  const fragments = [
    makeFragment("text"),
    makeFragment("pinned"),
    makeFragment("image-1", 1),
    makeFragment("image-2", 2),
    makeFragment("image-5", 5),
    { ...makeFragment("pinterest"), sourceType: "link", url: "https://pinterest.com/pin/1", linkMetadata: { provider: "pinterest", title: "Pin", description: "desc", canonicalUrl: "https://pinterest.com/pin/1", imageUrl: "https://img.example/pin.jpg", siteName: "Pinterest", contentType: "article", fetchedAt: exportedAt } },
    { ...makeFragment("instagram"), sourceType: "link", url: "https://instagram.com/p/1", linkMetadata: { provider: "instagram", title: "Post", canonicalUrl: "https://instagram.com/p/1", imageUrl: "https://img.example/post.jpg", contentType: "article", fetchedAt: exportedAt } },
    { ...makeFragment("youtube"), sourceType: "youtube", url: "https://youtu.be/test" },
  ];
  return {
    format: "chaejipbag-backup",
    version: 1,
    exportedAt,
    fragments,
    attachmentDataUrls: Object.fromEntries(
      fragments.flatMap((fragment) => (fragment.attachments ?? []).map((attachment) => [attachment.blobKey, PNG]))
    ),
  };
};

async function expectInvalid(raw: unknown, includes: string, fileSizeBytes = 0) {
  await assert.rejects(
    validateChaejipbagBackup(raw, fileSizeBytes),
    (error: unknown) => error instanceof BackupValidationError && error.userMessage.includes(includes)
  );
}

test("validates a full 1/2/5-image backup without copying metadata images", async () => {
  const validated = await validateChaejipbagBackup(makeBackup());
  assert.equal(validated.fragments.length, 8);
  assert.equal(validated.images.length, 8);
  assert.deepEqual(validated.fragments.find(({ id }) => id === "image-5")?.attachments?.map(({ filename }) => filename), ["0.png", "1.png", "2.png", "3.png", "4.png"]);
  assert.equal(validated.fragments.find(({ id }) => id === "pinned")?.pinnedAt, "2026-07-03T03:00:00.000Z");
  assert.equal(validated.fragments.find(({ id }) => id === "pinterest")?.linkMetadata?.imageUrl, "https://img.example/pin.jpg");
});

test("accepts empty and older backups and normalizes legacy inline images", async () => {
  const empty = await validateChaejipbagBackup({ format: "chaejipbag-backup", version: 1, exportedAt, fragments: [], attachmentDataUrls: {} });
  assert.deepEqual(empty.fragments, []);
  const legacy = makeFragment("legacy") as ReturnType<typeof makeFragment> & { attachments?: never; imageDataUrl?: string };
  delete (legacy as { attachments?: unknown }).attachments;
  legacy.imageDataUrl = PNG;
  legacy.imageKey = "old-image-key";
  const restored = await validateChaejipbagBackup({ format: "chaejipbag-backup", version: 1, exportedAt, fragments: [legacy] });
  assert.equal(restored.images.length, 1);
  assert.equal(restored.fragments[0].attachments?.[0].blobKey, "old-image-key");
});

test("rejects wrong formats, versions, duplicates, broken and disconnected images", async () => {
  await expectInvalid({ hello: "world" }, "아니에요");
  await expectInvalid({ ...makeBackup(), version: 2 }, "열 수 없는");
  const duplicate = makeBackup();
  duplicate.fragments.push({ ...duplicate.fragments[0] });
  await expectInvalid(duplicate, "같은 조각");
  const broken = makeBackup();
  broken.attachmentDataUrls["image-1-blob-0"] = "data:image/png;base64,%%%";
  await expectInvalid(broken, "손상된 이미지");
  const missing = makeBackup();
  delete missing.attachmentDataUrls["image-1-blob-0"];
  await expectInvalid(missing, "첨부 이미지가 빠진");
  const orphan = makeBackup();
  orphan.attachmentDataUrls.orphan = PNG;
  await expectInvalid(orphan, "연결된 조각이 없는");
  await expectInvalid(makeBackup(), "너무 커서", 151 * 1024 * 1024);
});

test("rejects empty and truncated files before touching storage", async () => {
  await assert.rejects(
    parseAndValidateBackupFile(new NodeFile([], "empty.json") as unknown as File),
    (error: unknown) => error instanceof BackupValidationError && error.userMessage.includes("내용이 없는")
  );
  await assert.rejects(
    parseAndValidateBackupFile(new NodeFile(["{\"format\":"], "truncated.json") as unknown as File),
    (error: unknown) => error instanceof BackupValidationError && error.userMessage.includes("파일을 읽을 수 없어요")
  );
});
test("rolls localStorage back when the IndexedDB replacement fails", async () => {
  const values = new Map([["chaejip-fragments", "old-fragments"]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
  const validated: ValidatedBackup = {
    backup: makeBackup() as unknown as ValidatedBackup["backup"],
    fragments: [makeFragment("new")],
    images: [],
  };
  await assert.rejects(
    restoreBackupWithAdapters(validated, async (_images, commit) => {
      commit();
      throw new Error("fixture write failure");
    }, storage),
    BackupValidationError
  );
  assert.equal(values.get("chaejip-fragments"), "old-fragments");
});
