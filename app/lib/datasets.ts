import fs from 'fs';
import path from 'path';

export const getDatasetsDir = () => {
    // If DATA_DIRECTORY env var is set, use it (e.g. /workspace/ on Vast.ai)
    // Otherwise, default to the project root (process.cwd()) for local dev
    const baseDir = process.env.DATA_DIRECTORY || process.cwd();
    const datasetsDir = path.join(baseDir, 'datasets');

    if (!fs.existsSync(datasetsDir)) {
        fs.mkdirSync(datasetsDir, { recursive: true });
    }

    return datasetsDir;
};
