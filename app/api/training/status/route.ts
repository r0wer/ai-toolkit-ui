import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const workspaceDir = process.env.DATA_DIRECTORY || '/workspace/';
        const logPath = path.join(workspaceDir, 'logs', 'training.log');

        if (!fs.existsSync(logPath)) {
            return NextResponse.json({ status: 'idle', logs: '' });
        }

        const logs = fs.readFileSync(logPath, 'utf-8');
        // Simple check if process is running could be added here (e.g. checking a PID file)
        // For now, we just return logs

        return NextResponse.json({ status: 'running', logs });
    } catch (error) {
        console.error('Error fetching training status:', error);
        return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
}
