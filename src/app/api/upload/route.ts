import { NextResponse } from 'next/server';
import { generatePresignedUploadUrl } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    // Optionally, verify user authentication here using Firebase Admin or Next Auth

    const { fileName, fileType } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'Missing fileName or fileType' },
        { status: 400 }
      );
    }

    // Generate a unique file name to avoid collisions
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${fileName}`;

    // Get the pre-signed URL and final file URL
    const { signedUrl, fileUrl } = await generatePresignedUploadUrl(
      uniqueFileName,
      fileType
    );

    return NextResponse.json({ signedUrl, fileUrl });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { fileUrls } = await request.json();
    if (!fileUrls || !Array.isArray(fileUrls)) {
      return NextResponse.json({ error: 'Missing or invalid fileUrls array' }, { status: 400 });
    }

    const { deleteFileFromS3 } = await import('@/lib/s3');
    
    await Promise.all(fileUrls.map(url => deleteFileFromS3(url)));

    return NextResponse.json({ message: 'Files deleted successfully' });
  } catch (error) {
    console.error('Error deleting S3 files:', error);
    return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 });
  }
}
