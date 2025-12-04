"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    const [rawLog, setRawLog] = useState('');
    const [advancedMode, setAdvancedMode] = useState(false);
    const [advancedConfig, setAdvancedConfig] = useState('');
    const [trainingCommand, setTrainingCommand] = useState('');
    const [checkpoints, setCheckpoints] = useState<any[]>([]);
    const logRef = useRef<HTMLDivElement>(null);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Parse log lines - handle \r (carriage return) for progress bars
    const logLines = useMemo(() => {
        if (!rawLog) return [];
        
        // Split at line breaks on \n or \r\n
        let splits: string[] = rawLog.split(/\n|\r\n/);

        // Handle \r within lines (progress bar updates)
        splits = splits.map(line => {
            // Get the last segment after any \r (this is what would be displayed)
            return line.split(/\r/).pop() || '';
        });

        // Filter out empty lines and limit to last 500 lines
        splits = splits.filter(line => line.trim() !== '');
        const maxLines = 500;
        if (splits.length > maxLines) {
            splits = splits.slice(splits.length - maxLines);
        }

        return splits;
    }, [rawLog]);

    // Handle scroll events to determine if user has scrolled away from bottom
    const handleScroll = () => {
        if (logRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logRef.current;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
            setIsScrolledToBottom(isAtBottom);
        }
    };

    // Auto-scroll to bottom only if we were already at the bottom
    useEffect(() => {
        if (logRef.current && isScrolledToBottom) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [rawLog, isScrolledToBottom]);

    // Fetch training status and logs
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/training/status');
            if (res.ok) {
                const data = await res.json();
                if (data.logs) {
                    setRawLog(data.logs);
                }
                const running = data.status === 'running';
                setIsTraining(running);
                return running;
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        }
        return false;
    }, []);

    // Check status on page load and start polling if training is running
    useEffect(() => {
        // Initial status check
        fetchStatus().then((running) => {
            if (running) {
                startPolling();
            }
        });

        // Cleanup on unmount
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [fetchStatus]);

    const startPolling = () => {
        // Clear existing polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
        }
        
        // Start new polling
        pollingRef.current = setInterval(async () => {
            const running = await fetchStatus();
            if (!running) {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            }
        }, 2000);
    };

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
  --seed 1337 \\
  --pretrained_model_name_or_path "/workspace/Chroma1-HD.safetensors" \\
  --model_type chroma \\
  --t5xxl "/workspace/t5xxl_fp16.safetensors" \\
  --ae "/workspace/ae.safetensors" \\
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
  --log_config \\
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
        setRawLog('Starting training...\n');

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
                setRawLog(prev => prev + 'Training started successfully!\n');
                // Start polling for logs
                startPolling();
            } else {
                setRawLog(prev => prev + 'Failed to start training.\n');
                setIsTraining(false);
            }
        } catch (error) {
            console.error('Error starting training:', error);
            setRawLog(prev => prev + 'Error starting training.\n');
            setIsTraining(false);
        }
    };

    return (
        <div className="flex h-screen bg-white font-sans text-gray-900 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-0 p-8 overflow-hidden">
                <header className="flex-shrink-0 mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Training</h1>
                    <p className="mt-1 text-gray-500">Configure and start your LoRA training.</p>
                </header>

                <div className="flex-1 grid gap-8 lg:grid-cols-2 min-h-0 overflow-hidden">
                    {/* Configuration Form */}
                    <div className="overflow-y-auto pr-2">
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
                    </div>

                    {/* Logs / Status */}
                    <div className="flex flex-col min-h-0 overflow-hidden">
                        <div className="flex-1 rounded-xl border border-gray-800 bg-gray-900 shadow-lg overflow-hidden flex flex-col">
                            <div className="flex-shrink-0 bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                                <h2 className="text-gray-100 font-medium flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-amber-400">
                                        <polyline points="4 17 10 11 4 5"></polyline>
                                        <line x1="12" y1="19" x2="20" y2="19"></line>
                                    </svg>
                                    Training Logs
                                </h2>
                                <div className="flex items-center space-x-2">
                                    {isTraining && (
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isTraining ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400'}`}>
                                        {isTraining ? 'RUNNING' : 'IDLE'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 bg-gray-950">
                                <div 
                                    ref={logRef}
                                    onScroll={handleScroll}
                                    className="h-full overflow-y-auto p-4 font-mono text-xs leading-relaxed"
                                >
                                    {logLines.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-600 italic">
                                            Waiting for logs...
                                        </div>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {logLines.map((line, index) => (
                                                <pre 
                                                    key={index} 
                                                    className="text-gray-300 whitespace-pre-wrap break-all hover:bg-gray-900/50 px-1 rounded transition-colors"
                                                >
                                                    {line}
                                                </pre>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Checkpoints */}
                        <div className="flex-shrink-0 mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-semibold text-gray-900">Checkpoints</h2>
                                <button
                                    onClick={fetchCheckpoints}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Refresh
                                </button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
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
