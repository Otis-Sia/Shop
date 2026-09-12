import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isValidCatalogImageUrl, sanitizeCatalogImageUrls } from '../src/lib/images/catalog-images';

describe('Catalog Images Sanitization & Validation', () => {
  test('should accept valid https image URLs', () => {
    assert.strictEqual(
      isValidCatalogImageUrl('https://juj4-shop-assets-2026.s3.eu-north-1.amazonaws.com/test-img.jpg'),
      true
    );
    assert.strictEqual(
      isValidCatalogImageUrl('https://i.ebayimg.com/images/g/v5wAAOSwPdRmCYuI/s-l1200.jpg'),
      true
    );
    assert.strictEqual(
      isValidCatalogImageUrl('https://havitsmart.com/cdn/shop/files/laptop-stand.png?v=12345'),
      true
    );
  });

  test('should reject social crawler and lookaside URLs', () => {
    assert.strictEqual(
      isValidCatalogImageUrl('https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=1891087127573443'),
      false
    );
    assert.strictEqual(
      isValidCatalogImageUrl('https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3826345477319490508'),
      false
    );
    assert.strictEqual(
      isValidCatalogImageUrl('https://attachment.fbsbx.com/photo.php?fbid=12345'),
      false
    );
    assert.strictEqual(
      isValidCatalogImageUrl('https://www.facebook.com/photo.php?fbid=1891087127573443'),
      false
    );
    assert.strictEqual(
      isValidCatalogImageUrl('https://www.tiktok.com/api/img/?itemId=7647274773537508629&location=0&aid=1988'),
      false
    );
    assert.strictEqual(
      isValidCatalogImageUrl('https://tv-it.com/storage/nermeen-aladin/oraimo-conch/oraimo-conch-2-neo-35mm-4.webp'),
      false
    );
  });

  test('should reject non-http, empty, and invalid formats', () => {
    assert.strictEqual(isValidCatalogImageUrl(''), false);
    assert.strictEqual(isValidCatalogImageUrl('   '), false);
    assert.strictEqual(isValidCatalogImageUrl(null), false);
    assert.strictEqual(isValidCatalogImageUrl(undefined), false);
    assert.strictEqual(isValidCatalogImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'), false);
    assert.strictEqual(isValidCatalogImageUrl('javascript:alert(1)'), false);
    assert.strictEqual(isValidCatalogImageUrl('https://example.com/product.html'), false);
  });

  test('sanitizeCatalogImageUrls should remove invalid URLs and duplicates while preserving valid ones', () => {
    const raw = [
      'https://juj4-shop-assets-2026.s3.eu-north-1.amazonaws.com/image1.jpg',
      'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=1891087127573443',
      'https://juj4-shop-assets-2026.s3.eu-north-1.amazonaws.com/image1.jpg', // Duplicate
      null,
      'https://www.tiktok.com/api/img/?itemId=123',
      'https://i.ebayimg.com/images/g/image2.png'
    ];

    const sanitized = sanitizeCatalogImageUrls(raw);
    assert.deepStrictEqual(sanitized, [
      'https://juj4-shop-assets-2026.s3.eu-north-1.amazonaws.com/image1.jpg',
      'https://i.ebayimg.com/images/g/image2.png'
    ]);
  });
});
