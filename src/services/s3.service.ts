import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ENV } from "../config";
import { randomUUID } from "crypto";
import path from "path";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: ENV.AWS_REGION,
      credentials: {
        accessKeyId: ENV.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export async function uploadFileToS3(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const ext = path.extname(originalName) || ".bin";
  const key = `uploads/${randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: ENV.AWS_S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await getS3Client().send(command);

  return `https://${ENV.AWS_S3_BUCKET}.s3.${ENV.AWS_REGION}.amazonaws.com/${key}`;
}
