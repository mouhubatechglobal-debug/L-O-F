import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { decodeDataUrl } from "../server/security.js";
import { getMedia, putMedia, removeMedia, storageMode } from "../server/storage.js";

const dirs = [];

afterEach(async () => {
  delete process.env.VERCEL;
  delete process.env.STORAGE_DRIVER;
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("local storage writes, reads and deletes an image", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lof-media-"));
  dirs.push(dir);
  process.env.UPLOAD_DIR = dir;
  process.env.STORAGE_DRIVER = "local";
  expect(storageMode()).toBe("local");
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const stored = await putMedia("media1", "png", "image/png", png);
  expect(stored.endsWith("media1.png")).toBe(true);
  expect(Buffer.compare(await getMedia(stored), png)).toBe(0);
  await removeMedia(stored);
  await expect(getMedia(stored)).rejects.toThrow();
});

test("vercel refuses the local upload folder", async () => {
  process.env.VERCEL = "1";
  process.env.STORAGE_DRIVER = "local";
  await expect(putMedia("x", "jpg", "image/jpeg", Buffer.from([1]))).rejects.toMatchObject({ code: "storage_unconfigured" });
});

test("a file that is not an image is rejected before storage", () => {
  expect(decodeDataUrl("data:image/png;base64,AAAA")).toBe(null);
  expect(decodeDataUrl("data:text/plain;base64,AAAA")).toBe(null);
});
