import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        const file = searchParams.get('file');

        if (!name || !file) {
            return NextResponse.json({ error: 'Name and file are required' }, { status: 400 });
        }

        const workspaceDir = process.env.DATA_DIRECTORY || '/workspace/';
        const filePath = path.join(workspaceDir, 'output', name, file);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${file}"`,
                'Content-Length': stats.size.toString(),
            },
        });
    } catch (error) {
        console.error('Error downloading checkpoint:', error);
        return NextResponse.json({ error: 'Failed to download checkpoint' }, { status: 500 });
    }
}
