import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the S3 client using environment variables
const s3Client = new S3Client({
  region: process.env.APP_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function generatePresignedUploadUrl(fileName: string, fileType: string) {
  const bucketName = process.env.APP_AWS_S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('APP_AWS_S3_BUCKET_NAME environment variable is not defined.');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: fileType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  return {
    signedUrl,
    fileUrl: `https://${bucketName}.s3.${process.env.APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`,
  };
}

export async function deleteFileFromS3(fileUrl: string) {
  const bucketName = process.env.APP_AWS_S3_BUCKET_NAME;
  if (!bucketName) throw new Error('APP_AWS_S3_BUCKET_NAME not defined.');

  try {
    const urlObj = new URL(fileUrl);
    // Keys usually start after the slash
    const key = urlObj.pathname.substring(1); 
    
    if (!key) return;

    const delCmd = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(delCmd);
  } catch (error) {
    console.error(`Failed to delete S3 file ${fileUrl}:`, error);
  }
}

export async function listAllS3Files(): Promise<string[]> {
  const bucketName = process.env.APP_AWS_S3_BUCKET_NAME;
  if (!bucketName) throw new Error('APP_AWS_S3_BUCKET_NAME not defined.');

  const files: string[] = [];
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;

  while (isTruncated) {
    const listCmd: any = new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken,
    });
    const response = await s3Client.send(listCmd) as any;
    
    if (response.Contents) {
      response.Contents.forEach((item: any) => {
        if (item.Key) {
          files.push(`https://${bucketName}.s3.${process.env.APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${item.Key}`);
        }
      });
    }

    isTruncated = response.IsTruncated ?? false;
    continuationToken = response.NextContinuationToken;
  }

  return files;
}
