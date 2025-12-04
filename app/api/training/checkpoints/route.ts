import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ error: 'Training name is required' }, { status: 400 });
        }

        const workspaceDir = process.env.DATA_DIRECTORY || '/workspace/';
        const outputDir = path.join(workspaceDir, 'output', name);

        if (!fs.existsSync(outputDir)) {
            return NextResponse.json([]);
        }

        const files = fs.readdirSync(outputDir)
            .filter(file => file.endsWith('.safetensors'))
            .map(file => {
                const filePath = path.join(outputDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    created: stats.birthtime
                };
            })
            .sort((a, b) => b.created.getTime() - a.created.getTime()); // Newest first

        return NextResponse.json(files);
    } catch (error) {
        console.error('Error listing checkpoints:', error);
        return NextResponse.json({ error: 'Failed to list checkpoints' }, { status: 500 });
    }
}
