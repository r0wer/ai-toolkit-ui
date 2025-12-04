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

        // Ensure the command runs in the correct directory and venv
        const wrapperScriptPath = path.join(workspaceDir, 'run_training.sh');
        const wrapperScript = `#!/bin/bash
cd "${sdScriptsDir}"
source venv/bin/activate
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
