import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Get the filename from the URL, default to logo.svg
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file') || 'logo.svg';

    // Validate filename to prevent directory traversal
    if (!filename.match(/^[a-zA-Z0-9._-]+\.(svg|png|jpg|jpeg)$/)) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Construct the file path in the public directory
    const filePath = path.join(process.cwd(), 'public', filename);

    try {
      // Read the file
      const fileBuffer = await readFile(filePath);

      // Determine content type
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' :
                         ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                         'image/svg+xml';

      // Convert to base64
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;

      return NextResponse.json({
        success: true,
        filename,
        contentType,
        dataUrl
      });
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: 'File not found', filename },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
