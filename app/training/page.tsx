"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';

interface Dataset {
    name: string;
    imageCount: number;
}

export default function TrainingPage() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDataset, setSelectedDataset] = useState('');
    const [trainingName, setTrainingName] = useState('my-lora');
    const [resolution, setResolution] = useState(512);
    const [batchSize, setBatchSize] = useState(2);
    const [steps, setSteps] = useState(2500);
    const [learningRate, setLearningRate] = useState(1);
    const [isTraining, setIsTraining] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [advancedMode, setAdvancedMode] = useState(false);
    const [advancedConfig, setAdvancedConfig] = useState('');
    const [trainingCommand, setTrainingCommand] = useState('');
    const [checkpoints, setCheckpoints] = useState<any[]>([]);

    const fetchCheckpoints = async () => {
        try {
            const res = await fetch(`/api/training/checkpoints?name=${trainingName}`);
            if (res.ok) {
                setCheckpoints(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch checkpoints:', error);
        }
    };

    useEffect(() => {
        if (isTraining) {
            const interval = setInterval(fetchCheckpoints, 10000); // Poll every 10s
            return () => clearInterval(interval);
        }
    }, [isTraining, trainingName]);

    useEffect(() => {
        // Update advanced config when simple params change
        const config = `
[[datasets]]
resolution = [${resolution}, ${resolution}]
batch_size = ${batchSize}
caption_extension = ".txt"
flip_aug = false

  [[datasets.subsets]]
  image_dir = '/workspace/datasets/${selectedDataset}'
  num_repeats = 10
`;
        setAdvancedConfig(config.trim());

        // Update training command
        const cmd = `accelerate launch --num_cpu_threads_per_process 2 \\
  flux_train_network.py \\
  --pretrained_model_name_or_path "/workspace/Chroma1-HD.safetensors" \\
  --dataset_config "/workspace/lora_config.toml" \\
  --output_dir "/workspace/output/${trainingName}" \\
  --output_name "${trainingName}" \\
  --max_train_steps ${steps} \\
  --learning_rate ${learningRate} \\
  --logging_dir "/workspace/logs" \\
  --save_model_as safetensors \\
  --network_module lycoris.kohya \\
  --network_dim 16 \\
  --network_alpha 1 \\
  --network_args "algo=locon" "preset=full" "dropout=0.1" "dora_wd=true" \\
  --optimizer_type "prodigyplus.ProdigyPlusScheduleFree" \\
  --optimizer_args "d_coef=1" "use_bias_correction=True" "betas=(0.98,0.99)" "use_speed=True" \\
  --lr_scheduler "constant_with_warmup" \\
  --lr_warmup_steps 200 \\
  --sdpa \\
  --save_every_n_steps 250 \\
  --model_prediction_type raw \\
  --mixed_precision bf16 \\
  --full_bf16 \\
  --gradient_checkpointing \\
  --gradient_accumulation 1 \\
  --guidance_scale 0.0 \\
  --timestep_sampling "sigmoid" \\
  --sigmoid_scale 1.0 \\
  --apply_t5_attn_mask \\
  --network_dropout 0.1 \\
  --network_train_unet_only \\
  --enable_bucket \\
  --min_bucket_reso 256 \\
  --max_bucket_reso 768 \\
  --persistent_data_loader_workers \\
  --max_data_loader_n_workers 2 \\
  --noise_offset 0.07 \\
  --min_snr_gamma 5 \\
  --multires_noise_iterations 6 \\
  --multires_noise_discount 0.3 \\
  --zero_terminal_snr \\
  --v_parameterization \\
  --cache_latents_to_disk \\
  --cache_text_encoder_outputs_to_disk \\
  --log_with tensorboard \\
  --save_precision fp16 \\
  --save_state`;
        setTrainingCommand(cmd);
    }, [resolution, batchSize, selectedDataset, trainingName, steps, learningRate]);

    useEffect(() => {
        fetch('/api/datasets')
            .then(res => res.json())
            .then(data => setDatasets(data));
    }, []);

    const startTraining = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsTraining(true);
        setLogs(['Starting training...']);

        try {
            const body = advancedMode ? {
                dataset: selectedDataset,
                name: trainingName,
                advancedConfig,
                trainingCommand,
                isAdvanced: true
            } : {
                dataset: selectedDataset,
                name: trainingName,
                resolution,
                batchSize,
                steps,
                learningRate,
                trainingCommand, // Send generated command even in simple mode
                isAdvanced: false
            };

            const res = await fetch('/api/training/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setLogs(prev => [...prev, 'Training started successfully!']);
                // Start polling for logs
                pollLogs();
            } else {
                setLogs(prev => [...prev, 'Failed to start training.']);
                setIsTraining(false);
            }
        } catch (error) {
            console.error('Error starting training:', error);
            setLogs(prev => [...prev, 'Error starting training.']);
            setIsTraining(false);
        }
    };

    const pollLogs = () => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/training/status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.logs) {
                        setLogs(data.logs.split('\n').slice(-50)); // Keep last 50 lines
                    }
                    if (data.status === 'completed' || data.status === 'failed') {
                        setIsTraining(false);
                        clearInterval(interval);
                    }
                }
            } catch (error) {
                console.error('Error polling logs:', error);
            }
        }, 2000);
    };

    return (
        <div className="flex min-h-screen bg-white font-sans text-gray-900">
            <Sidebar />
            <div className="flex-1 p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Training</h1>
                    <p className="mt-1 text-gray-500">Configure and start your LoRA training.</p>
                </header>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Configuration Form */}
                    <div className="space-y-6">
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
                                <button
                                    type="button"
                                    onClick={() => setAdvancedMode(!advancedMode)}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    {advancedMode ? 'Simple View' : 'Advanced View'}
                                </button>
                            </div>

                            {advancedMode ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            TOML Configuration
                                        </label>
                                        <textarea
                                            value={advancedConfig}
                                            onChange={(e) => setAdvancedConfig(e.target.value)}
                                            className="block w-full h-64 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-black focus:ring-black"
                                            spellCheck={false}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Training Command
                                        </label>
                                        <textarea
                                            value={trainingCommand}
                                            onChange={(e) => setTrainingCommand(e.target.value)}
                                            className="block w-full h-96 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-black focus:ring-black"
                                            spellCheck={false}
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            type="button"
                                            onClick={startTraining}
                                            disabled={isTraining}
                                            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            {isTraining ? 'Training in Progress...' : 'Start Training (Advanced)'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={startTraining} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Training Name</label>
                                        <input
                                            type="text"
                                            value={trainingName}
                                            onChange={(e) => setTrainingName(e.target.value)}
                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-black"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dataset</label>
                                        <select
                                            value={selectedDataset}
                                            onChange={(e) => setSelectedDataset(e.target.value)}
                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-black"
                                            required
                                        >
                                            <option value="">Select a dataset...</option>
                                            {datasets.map((d) => (
                                                <option key={d.name} value={d.name}>
                                                    {d.name} ({d.imageCount} images)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Resolution</label>
                                            <select
                                                value={resolution}
                                                onChange={(e) => setResolution(Number(e.target.value))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-black"
                                            >
                                                <option value={512}>512x512</option>
                                                <option value={768}>768x768</option>
                                                <option value={1024}>1024x1024</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Batch Size</label>
                                            <input
                                                type="number"
                                                value={batchSize}
                                                onChange={(e) => setBatchSize(Number(e.target.value))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-black"
                                                min={1}
                                                max={16}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Max Steps</label>
                                            <input
                                                type="number"
                                                value={steps}
                                                onChange={(e) => setSteps(Number(e.target.value))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-black"
                                                step={100}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Learning Rate</label>
                                            <input
                                                type="number"
                                                value={learningRate}
                                                onChange={(e) => setLearningRate(Number(e.target.value))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-black"
                                                step={0.1}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isTraining || !selectedDataset}
                                            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            {isTraining ? 'Training in Progress...' : 'Start Training'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Logs / Status */}
                    <div className="flex flex-col h-full space-y-6">
                        <div className="flex-1 rounded-xl border border-gray-200 bg-gray-900 p-6 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                            <h2 className="text-lg font-semibold text-white mb-4">Training Logs</h2>
                            <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-300 space-y-1">
                                {logs.length === 0 ? (
                                    <p className="text-gray-600 italic">Waiting for logs...</p>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="break-all">{log}</div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Checkpoints */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Checkpoints</h2>
                                <button
                                    onClick={fetchCheckpoints}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Refresh
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {checkpoints.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No checkpoints found yet.</p>
                                ) : (
                                    checkpoints.map((ckpt) => (
                                        <div key={ckpt.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{ckpt.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(ckpt.size / 1024 / 1024).toFixed(2)} MB • {new Date(ckpt.created).toLocaleString()}
                                                </p>
                                            </div>
                                            <a
                                                href={`/api/training/download?name=${trainingName}&file=${ckpt.name}`}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
