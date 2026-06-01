import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const products = await request.json();
    
    // Construct the path to the products.json file
    const filePath = path.join(process.cwd(), 'src', 'lib', 'data', 'products.json');
    
    // Write the updated products array to the file
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save products' },
      { status: 500 }
    );
  }
}
