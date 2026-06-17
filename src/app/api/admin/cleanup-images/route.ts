import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/api/products';
import { listAllS3Files, deleteFileFromS3 } from '@/lib/s3';

// Important: This should ideally be protected by admin authentication!
export async function POST(request: Request) {
  try {
    // 1. Fetch all products
    const products = await getProducts();

    // 2. Collect all valid image URLs used in Firestore
    const validImageUrls = new Set<string>();
    products.forEach(p => {
      if (p.image_url) validImageUrls.add(p.image_url);
      if (p.imageUrls) p.imageUrls.forEach(url => validImageUrls.add(url));
      if (p.additional_images) p.additional_images.forEach(url => validImageUrls.add(url));
      if (p.variants) {
        p.variants.forEach(v => {
          if (v.imageUrl) validImageUrls.add(v.imageUrl);
        });
      }
    });

    // 3. Fetch all files from S3 bucket
    const allS3Files = await listAllS3Files();

    // 4. Identify orphaned files (files in S3 but not in Firestore)
    const orphanedFiles = allS3Files.filter(fileUrl => !validImageUrls.has(fileUrl));

    // 5. Delete orphaned files
    let deletedCount = 0;
    if (orphanedFiles.length > 0) {
      await Promise.all(
        orphanedFiles.map(async (fileUrl) => {
          await deleteFileFromS3(fileUrl);
          deletedCount++;
        })
      );
    }

    return NextResponse.json({
      message: 'Cleanup successful',
      totalS3Files: allS3Files.length,
      validFirestoreImages: validImageUrls.size,
      orphanedFilesDeleted: deletedCount,
    });
  } catch (error: any) {
    console.error('Error during image cleanup:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}
