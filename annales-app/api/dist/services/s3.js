import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, } from '@aws-sdk/client-s3';
const s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: `http://${process.env.S3_ENDPOINT}`,
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});
export async function uploadBuffer(key, buffer, contentType) {
    await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));
    return key;
}
export async function downloadFile(key) {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
    });
    const response = await s3.send(command);
    if (!response.Body) {
        throw new Error('Fichier non trouvé dans S3');
    }
    const stream = response.Body;
    return {
        stream,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
    };
}
export async function deleteFile(key) {
    const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
    });
    await s3.send(command);
}
export function objectKey(...parts) {
    return parts.filter(Boolean).join('/');
}
