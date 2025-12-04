import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { getDatasetsDir } from '@/app/lib/datasets';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string; filename: string }> }
) {
    try {
        const { name, filename } = await params;
        const datasetsDir = getDatasetsDir();
        const filePath = path.join(datasetsDir, name, filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const contentType = mime.getType(filePath) || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ name: string; filename: string }> }
) {
    try {
        const { name, filename } = await params;
        const datasetsDir = getDatasetsDir();
        const filePath = path.join(datasetsDir, name, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Try to delete associated caption files
        const baseName = filename.substring(0, filename.lastIndexOf('.'));
        const extensions = ['.txt', '.caption'];

        for (const ext of extensions) {
            const captionPath = path.join(datasetsDir, name, baseName + ext);
            if (fs.existsSync(captionPath)) {
                fs.unlinkSync(captionPath);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting file:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
