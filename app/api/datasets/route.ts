import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsDir } from '@/app/lib/datasets';

export async function GET() {
    try {
        const datasetsDir = getDatasetsDir();

        const items = fs.readdirSync(datasetsDir, { withFileTypes: true });

        const datasets = items
            .filter(item => item.isDirectory() && !item.name.startsWith('.'))
            .map(dir => {
                const dirPath = path.join(datasetsDir, dir.name);
                // Count images in the directory
                const files = fs.readdirSync(dirPath);
                const imageCount = files.filter(file =>
                    /\.(jpg|jpeg|png|webp|caption|txt)$/i.test(file)
                ).length;

                return {
                    name: dir.name,
                    imageCount
                };
            });

        return NextResponse.json(datasets);
    } catch (error) {
        console.error('Error listing datasets:', error);
        return NextResponse.json({ error: 'Failed to list datasets' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid dataset name' }, { status: 400 });
        }

        // Sanitize name
        const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '');

        if (!sanitizedName) {
            return NextResponse.json({ error: 'Invalid dataset name characters' }, { status: 400 });
        }

        const datasetsDir = getDatasetsDir();
        const newDatasetPath = path.join(datasetsDir, sanitizedName);

        if (fs.existsSync(newDatasetPath)) {
            return NextResponse.json({ error: 'Dataset already exists' }, { status: 409 });
        }

        fs.mkdirSync(newDatasetPath);

        return NextResponse.json({ name: sanitizedName, imageCount: 0 });
    } catch (error) {
        console.error('Error creating dataset:', error);
        return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
    }
}
