import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { log } from "./security.js";

function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "server", "uploads");
}

export function storageMode() {
  if (process.env.STORAGE_DRIVER === "local") return "local";
  if (process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY) return "s3";
  return "local";
}

function requireCloud() {
  if (storageMode() !== "s3") {
    const err = new Error("stockage objet non configuré");
    err.code = "storage_unconfigured";
    throw err;
  }
}

let s3;

async function client() {
  if (s3) return s3;
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3 = new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "1",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    },
  });
  return s3;
}

export async function putMedia(id, ext, mime, buf) {
  if (process.env.VERCEL && storageMode() !== "s3") {
    const err = new Error("Vercel ne conserve pas server/uploads");
    err.code = "storage_unconfigured";
    throw err;
  }
  if (storageMode() === "s3") {
    requireCloud();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const key = `media/${id}.${ext}`;
    await (await client()).send(new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET,
      Key: key,
      Body: buf,
      ContentType: mime,
    }));
    return `s3:${key}`;
  }
  await mkdir(uploadDir(), { recursive: true });
  const file = path.join(uploadDir(), `${id}.${ext}`);
  await writeFile(file, buf);
  return file;
}

export async function getMedia(storedPath) {
  if (String(storedPath).startsWith("s3:")) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const key = String(storedPath).slice(3);
    const out = await (await client()).send(new GetObjectCommand({
      Bucket: process.env.STORAGE_BUCKET,
      Key: key,
    }));
    return Buffer.from(await out.Body.transformToByteArray());
  }
  return readFile(storedPath);
}

export async function removeMedia(storedPath) {
  if (!storedPath) return;
  if (String(storedPath).startsWith("s3:")) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await client()).send(new DeleteObjectCommand({
      Bucket: process.env.STORAGE_BUCKET,
      Key: String(storedPath).slice(3),
    }));
    return;
  }
  await unlink(storedPath).catch((err) => {
    if (err.code !== "ENOENT") log("error", "media_unlink", { message: err.message });
  });
}
