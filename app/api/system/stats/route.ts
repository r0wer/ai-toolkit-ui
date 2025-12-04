import { NextResponse } from 'next/server';
import si from 'systeminformation';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function GET() {
    try {
        const [cpu, mem, currentLoad] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.currentLoad(),
        ]);

        let gpuInfo = null;
        try {
            // Try to get NVIDIA GPU info
            const { stdout } = await execAsync('nvidia-smi --query-gpu=name,utilization.gpu,memory.total,memory.used --format=csv,noheader,nounits');
            const [name, util, total, used] = stdout.trim().split(', ');
            gpuInfo = {
                name,
                utilization: parseFloat(util),
                memoryTotal: parseFloat(total),
                memoryUsed: parseFloat(used),
            };
        } catch (e) {
            // Ignore if nvidia-smi fails (e.g. local dev without GPU)
            console.log('GPU info not available');
        }

        return NextResponse.json({
            cpu: {
                manufacturer: cpu.manufacturer,
                brand: cpu.brand,
                speed: cpu.speed,
                cores: cpu.cores,
                load: currentLoad.currentLoad,
            },
            memory: {
                total: mem.total,
                free: mem.free,
                used: mem.used,
                active: mem.active,
                available: mem.available,
            },
            gpu: gpuInfo,
        });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        return NextResponse.json({ error: 'Failed to fetch system stats' }, { status: 500 });
    }
}
