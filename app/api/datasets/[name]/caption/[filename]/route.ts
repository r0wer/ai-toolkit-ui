import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsDir } from '@/app/lib/datasets';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string; filename: string }> }
) {
    try {
        const { name, filename } = await params;
        const datasetsDir = getDatasetsDir();

        // Determine caption file path (try .txt then .caption)
        const baseName = filename.substring(0, filename.lastIndexOf('.'));
        let captionPath = path.join(datasetsDir, name, baseName + '.txt');

        if (!fs.existsSync(captionPath)) {
            const altPath = path.join(datasetsDir, name, baseName + '.caption');
            if (fs.existsSync(altPath)) {
                captionPath = altPath;
            } else {
                // Return empty if no caption exists
                return NextResponse.json({ caption: '' });
            }
        }

        const caption = fs.readFileSync(captionPath, 'utf-8');
        return NextResponse.json({ caption });
    } catch (error) {
        console.error('Error fetching caption:', error);
        return NextResponse.json({ error: 'Failed to fetch caption' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ name: string; filename: string }> }
) {
    try {
        const { name, filename } = await params;
        const { caption } = await request.json();

        const datasetsDir = getDatasetsDir();
        const baseName = filename.substring(0, filename.lastIndexOf('.'));

        // Default to .txt for new captions, but respect existing .caption files
        let captionPath = path.join(datasetsDir, name, baseName + '.txt');
        const altPath = path.join(datasetsDir, name, baseName + '.caption');

        if (fs.existsSync(altPath)) {
            captionPath = altPath;
        }

        fs.writeFileSync(captionPath, caption || '');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving caption:', error);
        return NextResponse.json({ error: 'Failed to save caption' }, { status: 500 });
    }
}
