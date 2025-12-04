import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getDatasetsDir } from '@/app/lib/datasets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { dataset, name, resolution, batchSize, steps, learningRate, advancedConfig, isAdvanced, trainingCommand } = body;

        const workspaceDir = process.env.DATA_DIRECTORY || '/workspace/';
        const datasetsDir = getDatasetsDir();
        // If advanced, dataset might be embedded in config, but we still need paths for other things
        // For simplicity, we assume dataset name is passed even in advanced mode for path resolution if needed,
        // but the config content is what matters.

        const outputDir = path.join(workspaceDir, 'output', name);
        const logsDir = path.join(workspaceDir, 'logs');

        // Create directories
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

        // Generate lora_config.toml
        let configContent = '';

        if (isAdvanced && advancedConfig) {
            configContent = advancedConfig;
        } else {
            const datasetPath = path.join(datasetsDir, dataset);
            configContent = `
[[datasets]]
resolution = [${resolution}, ${resolution}]
batch_size = ${batchSize}
caption_extension = ".txt"
flip_aug = false

  [[datasets.subsets]]
  image_dir = '${datasetPath.replace(/\\/g, '/')}'
  num_repeats = 10
`;
        }

        const configPath = path.join(workspaceDir, 'lora_config.toml');
        fs.writeFileSync(configPath, configContent);

        // Prepare training command
        // We expect 'trainingCommand' to be passed from the frontend (which generates it based on defaults or user edits)
        // If for some reason it's missing (legacy call), we fall back to a basic default, but frontend should always send it now.

        const sdScriptsDir = path.join(workspaceDir, 'sd-scripts');

        // Fallback for safety if trainingCommand isn't sent
        let finalCommand = trainingCommand;
        if (!finalCommand) {
            // ... (could keep old logic here as fallback, but for now assuming frontend sends it)
            // Minimal fallback to avoid crash
            finalCommand = `echo "Error: No training command provided"`;
        }

        // Ensure models are present before starting
        // We add a pre-check script to the wrapper
        const wrapperScriptPath = path.join(workspaceDir, 'run_training.sh');

        // Script to download models if missing or corrupted (too small)
        const downloadLogic = `
check_and_download() {
    FILE="$1"
    URL="$2"
    MIN_SIZE="$3"
    
    if [ -f "$FILE" ]; then
        SIZE=$(stat -c%s "$FILE")
        if [ "$SIZE" -lt "$MIN_SIZE" ]; then
            echo "File $FILE is too small ($SIZE bytes), likely corrupted. Deleting and redownloading..."
            rm "$FILE"
        else
            echo "File $FILE exists and size is OK ($SIZE bytes)."
        fi
    fi

    if [ ! -f "$FILE" ]; then
        echo "Downloading $FILE from $URL..."
        # Use wget with progress bar
        wget --progress=dot:giga "$URL" -O "$FILE"
        
        # Verify download
        if [ $? -ne 0 ]; then
            echo "Error downloading $FILE"
            exit 1
        fi
    fi
}

# Chroma1-HD (Expect > 5GB)
check_and_download "${workspaceDir}/Chroma1-HD.safetensors" "https://huggingface.co/chroma-weights/Chroma1-HD/resolve/main/Chroma1-HD.safetensors" 5000000000

# T5 Encoder (Expect > 4GB)
check_and_download "${workspaceDir}/t5xxl_fp16.safetensors" "https://huggingface.co/chroma-weights/Chroma1-HD/resolve/main/t5xxl_fp16.safetensors" 4000000000

# VAE (Expect > 100MB)
check_and_download "${workspaceDir}/ae.safetensors" "https://huggingface.co/chroma-weights/Chroma1-HD/resolve/main/ae.safetensors" 100000000
`;

        const wrapperScript = `#!/bin/bash
cd "${sdScriptsDir}"
source venv/bin/activate

${downloadLogic}

# Execute the command passed from UI
${finalCommand}
`;
        fs.writeFileSync(wrapperScriptPath, wrapperScript);
        fs.chmodSync(wrapperScriptPath, '755');

        const child = spawn(wrapperScriptPath, [], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Stream logs to file
        const logFile = fs.createWriteStream(path.join(logsDir, 'training.log'));
        child.stdout.pipe(logFile);
        child.stderr.pipe(logFile);

        child.unref();

        return NextResponse.json({ success: true, pid: child.pid });
    } catch (error) {
        console.error('Error starting training:', error);
        return NextResponse.json({ error: 'Failed to start training' }, { status: 500 });
    }
}
