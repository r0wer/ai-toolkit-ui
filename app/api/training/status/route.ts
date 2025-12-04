import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function isTrainingRunning(): boolean {
    try {
        const isWin = process.platform === 'win32';
        if (isWin) {
            // Windows: check for python/accelerate process
            const result = execSync('tasklist /FI "IMAGENAME eq python.exe" 2>nul', { encoding: 'utf-8' });
            return result.includes('python.exe');
        } else {
            // Linux: check for flux_train_network.py or accelerate process
            const result = execSync('pgrep -f "flux_train_network.py|accelerate" 2>/dev/null || true', { encoding: 'utf-8' });
            return result.trim().length > 0;
        }
    } catch {
        return false;
    }
}

export async function GET() {
    try {
        const workspaceDir = process.env.DATA_DIRECTORY || '/workspace/';
        const logPath = path.join(workspaceDir, 'logs', 'training.log');

        if (!fs.existsSync(logPath)) {
            return NextResponse.json({ status: 'idle', logs: '' });
        }

        const logs = fs.readFileSync(logPath, 'utf-8');
        const running = isTrainingRunning();
        
        // Detect completion or error from logs
        let status = 'idle';
        if (running) {
            status = 'running';
        } else if (logs.includes('TRAINING FINISHED') || logs.includes('training completed')) {
            status = 'completed';
        } else if (logs.includes('Error:') || logs.includes('Traceback')) {
            status = 'failed';
        }

        return NextResponse.json({ status, logs });
    } catch (error) {
        console.error('Error fetching training status:', error);
        return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
}
