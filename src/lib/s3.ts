import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the S3 client using environment variables
const s3Client = new S3Client({
  region: process.env.APP_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Generates a pre-signed URL for uploading a file to S3.
 *
 * @param fileName - The unique name of the file to save in the bucket
 * @param fileType - The MIME type of the file
 * @returns An object containing the pre-signed upload URL and the final accessible URL
 */
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

  // URL expires in 60 seconds
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  return {
    signedUrl,
    // Note: If your bucket is public, this URL can be used to view the file.
    // If not, you'll need to generate download pre-signed URLs or use CloudFront.
    fileUrl: `https://${bucketName}.s3.${process.env.APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`,
  };
}
