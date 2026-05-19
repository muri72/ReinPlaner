import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const filePath = join(process.cwd(), 'src/app/api/openapi.json');
  const fileContents = readFileSync(filePath, 'utf8');
  return new NextResponse(fileContents, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}