import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

type UploadR2ObjectInput = {
  body: Buffer;
  contentType: string;
  key: string;
};

export async function uploadR2Object({
  body,
  contentType,
  key,
}: UploadR2ObjectInput) {
  const { bucketName } = getR2Config();

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getR2Object(key: string) {
  const { bucketName } = getR2Config();

  return getR2Client().send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

export async function deleteR2Object(key: string) {
  const { bucketName } = getR2Config();

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

export function createR2ObjectKey(userId: string, fileName: string) {
  const safeFileName =
    fileName
      .trim()
      .replace(/[/\\]/g, "-")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "upload";

  return `users/${userId}/${crypto.randomUUID()}-${safeFileName}`;
}

function getR2Client() {
  if (r2Client) {
    return r2Client;
  }

  const {
    accessKeyId,
    accountId,
    secretAccessKey,
  } = getR2Config();

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return r2Client;
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Cloudflare R2 is not configured.");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}
