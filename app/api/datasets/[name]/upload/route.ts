import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsDir } from '@/app/lib/datasets';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const { name } = await params;
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        const datasetsDir = getDatasetsDir();
        const datasetPath = path.join(datasetsDir, name);

        if (!fs.existsSync(datasetPath)) {
            return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
        }

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const filePath = path.join(datasetPath, file.name);
            fs.writeFileSync(filePath, buffer);
        }

        return NextResponse.json({ success: true, count: files.length });
    } catch (error) {
        console.error('Error uploading files:', error);
        return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
    }
}
