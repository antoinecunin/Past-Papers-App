import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: `http://${process.env.S3_ENDPOINT}`,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! }
});

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: contentType
  }));
  return key;
}

export function objectKey(...parts: string[]) {
  return parts.filter(Boolean).join('/');
}