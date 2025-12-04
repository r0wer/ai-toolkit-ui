import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsDir } from '@/app/lib/datasets';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const { name } = await params;
        const datasetsDir = getDatasetsDir();
        const datasetPath = path.join(datasetsDir, name);

        if (!fs.existsSync(datasetPath)) {
            return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
        }

        const files = fs.readdirSync(datasetPath);

        const datasetFiles = files
            .filter(file => !file.startsWith('.'))
            .map(file => {
                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file);
                return {
                    name: file,
                    url: `/api/datasets/${name}/file/${file}`,
                    type: isImage ? 'image' : 'text'
                };
            });

        return NextResponse.json({ name, files: datasetFiles });
    } catch (error) {
        console.error('Error fetching dataset:', error);
        return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });
    }
}
