#!/usr/bin/env python3
"""
🎨 Chroma LoRA Training UI - Gradio Version
A beautiful and functional UI for training LoRA models on Chroma.
"""

import gradio as gr
import os
import subprocess
import threading
import time
from pathlib import Path
from datetime import datetime
import shutil
import json

# ============================================================================
# Configuration
# ============================================================================

WORKSPACE_DIR = os.environ.get("DATA_DIRECTORY", "/workspace")
DATASETS_DIR = os.path.join(WORKSPACE_DIR, "datasets")
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "output")
LOGS_DIR = os.path.join(WORKSPACE_DIR, "logs")
SD_SCRIPTS_DIR = os.path.join(WORKSPACE_DIR, "sd-scripts")

# Ensure directories exist
for d in [DATASETS_DIR, OUTPUT_DIR, LOGS_DIR]:
    os.makedirs(d, exist_ok=True)

# Global state
training_process = None
training_log = ""
is_training = False

# ============================================================================
# Dataset Functions
# ============================================================================

def get_datasets():
    """Get list of available datasets."""
    if not os.path.exists(DATASETS_DIR):
        return []
    datasets = []
    for name in os.listdir(DATASETS_DIR):
        path = os.path.join(DATASETS_DIR, name)
        if os.path.isdir(path):
            # Count images
            images = list(Path(path).glob("*.png")) + list(Path(path).glob("*.jpg")) + list(Path(path).glob("*.jpeg"))
            datasets.append({"name": name, "count": len(images)})
    return datasets

def get_dataset_choices():
    """Get dataset choices for dropdown."""
    datasets = get_datasets()
    return [f"{d['name']} ({d['count']} images)" for d in datasets]

def get_dataset_name(choice):
    """Extract dataset name from choice string."""
    if not choice:
        return None
    return choice.split(" (")[0]

def get_dataset_images(dataset_choice):
    """Get images from a dataset as gallery items."""
    dataset_name = get_dataset_name(dataset_choice)
    if not dataset_name:
        return []
    
    path = Path(DATASETS_DIR) / dataset_name
    if not path.exists():
        return []
    
    images = []
    for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp"]:
        for img_path in sorted(path.glob(ext)):
            # Get caption if exists
            caption_path = img_path.with_suffix(".txt")
            caption = ""
            if caption_path.exists():
                caption = caption_path.read_text(encoding="utf-8").strip()[:100]
            images.append((str(img_path), caption or img_path.name))
    
    return images

def get_image_caption(dataset_choice, evt: gr.SelectData):
    """Get full caption for selected image."""
    dataset_name = get_dataset_name(dataset_choice)
    if not dataset_name or evt.index is None:
        return "", "", None
    
    path = Path(DATASETS_DIR) / dataset_name
    images = []
    for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp"]:
        images.extend(sorted(path.glob(ext)))
    
    if evt.index >= len(images):
        return "", "", None
    
    img_path = images[evt.index]
    caption_path = img_path.with_suffix(".txt")
    caption = ""
    if caption_path.exists():
        caption = caption_path.read_text(encoding="utf-8").strip()
    
    return str(img_path), caption, str(img_path)

def save_caption(image_path, caption):
    """Save caption for an image."""
    if not image_path:
        return "❌ No image selected"
    
    caption_path = Path(image_path).with_suffix(".txt")
    caption_path.write_text(caption, encoding="utf-8")
    return f"✅ Caption saved for {Path(image_path).name}"

def create_dataset(name):
    """Create a new dataset folder."""
    if not name or not name.strip():
        return "❌ Please enter a dataset name", get_dataset_choices()
    
    name = name.strip().replace(" ", "_")
    path = Path(DATASETS_DIR) / name
    
    if path.exists():
        return f"❌ Dataset '{name}' already exists", get_dataset_choices()
    
    path.mkdir(parents=True)
    return f"✅ Created dataset '{name}'", get_dataset_choices()

def delete_dataset(dataset_choice):
    """Delete a dataset."""
    dataset_name = get_dataset_name(dataset_choice)
    if not dataset_name:
        return "❌ No dataset selected", get_dataset_choices(), []
    
    path = Path(DATASETS_DIR) / dataset_name
    if path.exists():
        shutil.rmtree(path)
        return f"✅ Deleted dataset '{dataset_name}'", get_dataset_choices(), []
    
    return f"❌ Dataset '{dataset_name}' not found", get_dataset_choices(), []

def upload_images(dataset_choice, files):
    """Upload images to a dataset."""
    dataset_name = get_dataset_name(dataset_choice)
    if not dataset_name:
        return "❌ No dataset selected", []
    
    if not files:
        return "❌ No files selected", get_dataset_images(dataset_choice)
    
    path = Path(DATASETS_DIR) / dataset_name
    count = 0
    
    for file in files:
        if file is None:
            continue
        src = Path(file.name if hasattr(file, 'name') else file)
        if src.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp"]:
            dst = path / src.name
            shutil.copy(str(src), str(dst))
            count += 1
    
    return f"✅ Uploaded {count} images", get_dataset_images(dataset_choice)

def delete_image(dataset_choice, image_path):
    """Delete an image from dataset."""
    if not image_path:
        return "❌ No image selected", [], ""
    
    img_path = Path(image_path)
    caption_path = img_path.with_suffix(".txt")
    
    if img_path.exists():
        img_path.unlink()
    if caption_path.exists():
        caption_path.unlink()
    
    return f"✅ Deleted {img_path.name}", get_dataset_images(dataset_choice), ""

# ============================================================================
# Training Functions
# ============================================================================

def generate_training_command(dataset_name, lora_name, steps, resolution, batch_size, learning_rate):
    """Generate the training command."""
    dataset_path = os.path.join(DATASETS_DIR, dataset_name)
    output_path = os.path.join(OUTPUT_DIR, lora_name)
    
    # Generate TOML config
    toml_content = f"""[[datasets]]
resolution = [{resolution}, {resolution}]
batch_size = {batch_size}
caption_extension = ".txt"
flip_aug = false

  [[datasets.subsets]]
  image_dir = '{dataset_path}'
  num_repeats = 10
"""
    
    config_path = os.path.join(WORKSPACE_DIR, "lora_config.toml")
    with open(config_path, "w") as f:
        f.write(toml_content)
    
    cmd = f"""cd {SD_SCRIPTS_DIR} && source venv/bin/activate && accelerate launch --num_cpu_threads_per_process 2 \\
  flux_train_network.py \\
  --seed 1337 \\
  --pretrained_model_name_or_path "{WORKSPACE_DIR}/Chroma1-HD.safetensors" \\
  --model_type chroma \\
  --t5xxl "{WORKSPACE_DIR}/t5xxl_fp16.safetensors" \\
  --ae "{WORKSPACE_DIR}/ae.safetensors" \\
  --dataset_config "{config_path}" \\
  --output_dir "{output_path}" \\
  --output_name "{lora_name}" \\
  --max_train_steps {steps} \\
  --learning_rate {learning_rate} \\
  --logging_dir "{LOGS_DIR}" \\
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
  --save_state"""
    
    return cmd

def start_training(dataset_choice, lora_name, steps, resolution, batch_size, learning_rate):
    """Start the training process."""
    global training_process, training_log, is_training
    
    if is_training:
        return "⚠️ Training already in progress!", training_log
    
    dataset_name = get_dataset_name(dataset_choice)
    if not dataset_name:
        return "❌ Please select a dataset", ""
    
    if not lora_name or not lora_name.strip():
        return "❌ Please enter a LoRA name", ""
    
    # Check dataset has images
    images = get_dataset_images(dataset_choice)
    if not images:
        return "❌ Dataset has no images", ""
    
    lora_name = lora_name.strip().replace(" ", "_")
    training_log = f"🚀 Starting training: {lora_name}\n"
    training_log += f"📁 Dataset: {dataset_name} ({len(images)} images)\n"
    training_log += f"⚙️ Steps: {steps}, Resolution: {resolution}, Batch: {batch_size}, LR: {learning_rate}\n"
    training_log += "=" * 60 + "\n\n"
    
    # Generate command
    cmd = generate_training_command(dataset_name, lora_name, steps, resolution, batch_size, learning_rate)
    
    # Save log
    log_path = os.path.join(LOGS_DIR, "training.log")
    with open(log_path, "w") as f:
        f.write(training_log)
    
    # Start training in background
    def run_training():
        global training_process, training_log, is_training
        is_training = True
        
        try:
            training_process = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            for line in iter(training_process.stdout.readline, ''):
                if line:
                    # Handle carriage return for progress bars
                    if '\r' in line:
                        line = line.split('\r')[-1]
                    training_log += line
                    # Save to file
                    with open(log_path, "a") as f:
                        f.write(line)
            
            training_process.wait()
            
            if training_process.returncode == 0:
                training_log += "\n\n✅ TRAINING COMPLETED SUCCESSFULLY!\n"
            else:
                training_log += f"\n\n❌ Training failed with code {training_process.returncode}\n"
                
        except Exception as e:
            training_log += f"\n\n❌ Error: {str(e)}\n"
        finally:
            is_training = False
            with open(log_path, "a") as f:
                f.write(training_log.split('\n')[-1])
    
    thread = threading.Thread(target=run_training, daemon=True)
    thread.start()
    
    return "✅ Training started!", training_log

def stop_training():
    """Stop the training process."""
    global training_process, is_training, training_log
    
    if training_process and is_training:
        training_process.terminate()
        training_log += "\n\n⚠️ Training stopped by user\n"
        is_training = False
        return "⚠️ Training stopped", training_log
    
    return "ℹ️ No training in progress", training_log

def get_training_logs():
    """Get current training logs."""
    global training_log, is_training
    
    # Also try to read from file
    log_path = os.path.join(LOGS_DIR, "training.log")
    if os.path.exists(log_path):
        with open(log_path, "r") as f:
            file_log = f.read()
        if len(file_log) > len(training_log):
            training_log = file_log
    
    status = "🟢 Training in progress..." if is_training else "⚪ Idle"
    return training_log, status

def get_checkpoints(lora_name):
    """Get list of checkpoints for a LoRA."""
    if not lora_name:
        return []
    
    lora_name = lora_name.strip().replace(" ", "_")
    output_path = Path(OUTPUT_DIR) / lora_name
    
    if not output_path.exists():
        return []
    
    checkpoints = []
    for f in output_path.glob("*.safetensors"):
        size_mb = f.stat().st_size / 1024 / 1024
        modified = datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
        checkpoints.append([f.name, f"{size_mb:.1f} MB", modified])
    
    return sorted(checkpoints, key=lambda x: x[0], reverse=True)

def download_checkpoint(lora_name, checkpoint_name):
    """Get checkpoint file path for download."""
    if not lora_name or not checkpoint_name:
        return None
    
    lora_name = lora_name.strip().replace(" ", "_")
    file_path = Path(OUTPUT_DIR) / lora_name / checkpoint_name
    
    if file_path.exists():
        return str(file_path)
    return None

# ============================================================================
# System Monitor Functions
# ============================================================================

def get_gpu_info():
    """Get GPU information."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu", 
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(", ")
            if len(parts) >= 5:
                name = parts[0]
                mem_used = float(parts[1])
                mem_total = float(parts[2])
                util = int(parts[3])
                temp = int(parts[4])
                mem_percent = (mem_used / mem_total) * 100
                return f"""### 🎮 GPU: {name}
| Metric | Value |
|--------|-------|
| Memory | {mem_used:.0f} / {mem_total:.0f} MB ({mem_percent:.1f}%) |
| Utilization | {util}% |
| Temperature | {temp}°C |"""
    except:
        pass
    return "### 🎮 GPU: Unable to get info"

def get_system_info():
    """Get system information."""
    gpu_info = get_gpu_info()
    
    # Disk space
    try:
        total, used, free = shutil.disk_usage(WORKSPACE_DIR)
        disk_info = f"💾 Disk: {used/1024**3:.1f} / {total/1024**3:.1f} GB ({(used/total)*100:.1f}%)"
    except:
        disk_info = "💾 Disk: Unable to get info"
    
    return f"{gpu_info}\n\n{disk_info}"

# ============================================================================
# UI Definition
# ============================================================================

# Custom CSS for better styling
custom_css = """
.container { max-width: 1400px; margin: auto; }
.dark { background-color: #1a1a2e; }
.terminal { 
    background-color: #0d1117 !important; 
    font-family: 'Fira Code', 'Monaco', monospace !important;
    font-size: 12px !important;
    color: #c9d1d9 !important;
}
.status-running { color: #22c55e; font-weight: bold; }
.status-idle { color: #6b7280; }
footer { display: none !important; }
"""

def create_ui():
    """Create the Gradio UI."""
    
    with gr.Blocks(
        title="🎨 Chroma LoRA Training",
        css=custom_css
    ) as app:
        
        gr.Markdown("""
        # 🎨 Chroma LoRA Training UI
        Train custom LoRA models on Chroma with an easy-to-use interface.
        """)
        
        with gr.Tabs():
            # ================================================================
            # DATASETS TAB
            # ================================================================
            with gr.Tab("📁 Datasets", id="datasets"):
                with gr.Row():
                    # Left column - Dataset list & management
                    with gr.Column(scale=1):
                        gr.Markdown("### 📂 Dataset Management")
                        
                        dataset_dropdown = gr.Dropdown(
                            choices=get_dataset_choices(),
                            label="Select Dataset",
                            interactive=True
                        )
                        
                        refresh_btn = gr.Button("🔄 Refresh", size="sm")
                        
                        with gr.Accordion("➕ Create New Dataset", open=False):
                            new_dataset_name = gr.Textbox(label="Dataset Name", placeholder="my_dataset")
                            create_btn = gr.Button("Create Dataset", variant="primary")
                        
                        with gr.Accordion("📤 Upload Images", open=False):
                            upload_files = gr.File(
                                label="Drop images here",
                                file_count="multiple",
                                file_types=["image"]
                            )
                            upload_btn = gr.Button("Upload to Dataset", variant="primary")
                        
                        with gr.Accordion("🗑️ Delete Dataset", open=False):
                            delete_dataset_btn = gr.Button("Delete Selected Dataset", variant="stop")
                        
                        dataset_status = gr.Markdown("")
                    
                    # Right column - Gallery & Caption Editor
                    with gr.Column(scale=3):
                        gr.Markdown("### 🖼️ Images")
                        
                        gallery = gr.Gallery(
                            label="Dataset Images",
                            show_label=False,
                            columns=5,
                            rows=3,
                            height=400,
                            object_fit="cover",
                            allow_preview=True
                        )
                        
                        with gr.Row():
                            with gr.Column(scale=2):
                                selected_image_path = gr.Textbox(label="Selected Image", interactive=False)
                                caption_editor = gr.Textbox(
                                    label="✏️ Caption",
                                    lines=3,
                                    placeholder="Enter caption for this image..."
                                )
                                with gr.Row():
                                    save_caption_btn = gr.Button("💾 Save Caption", variant="primary")
                                    delete_image_btn = gr.Button("🗑️ Delete Image", variant="stop")
                            
                            with gr.Column(scale=1):
                                selected_preview = gr.Image(label="Preview", height=200)
                        
                        caption_status = gr.Markdown("")
                
                # Dataset event handlers
                refresh_btn.click(
                    fn=lambda: gr.update(choices=get_dataset_choices()),
                    outputs=dataset_dropdown
                )
                
                dataset_dropdown.change(
                    fn=get_dataset_images,
                    inputs=dataset_dropdown,
                    outputs=gallery
                )
                
                gallery.select(
                    fn=get_image_caption,
                    inputs=dataset_dropdown,
                    outputs=[selected_image_path, caption_editor, selected_preview]
                )
                
                save_caption_btn.click(
                    fn=save_caption,
                    inputs=[selected_image_path, caption_editor],
                    outputs=caption_status
                )
                
                create_btn.click(
                    fn=create_dataset,
                    inputs=new_dataset_name,
                    outputs=[dataset_status, dataset_dropdown]
                )
                
                delete_dataset_btn.click(
                    fn=delete_dataset,
                    inputs=dataset_dropdown,
                    outputs=[dataset_status, dataset_dropdown, gallery]
                )
                
                upload_btn.click(
                    fn=upload_images,
                    inputs=[dataset_dropdown, upload_files],
                    outputs=[dataset_status, gallery]
                )
                
                delete_image_btn.click(
                    fn=delete_image,
                    inputs=[dataset_dropdown, selected_image_path],
                    outputs=[caption_status, gallery, selected_image_path]
                )
            
            # ================================================================
            # TRAINING TAB
            # ================================================================
            with gr.Tab("🚀 Training", id="training"):
                with gr.Row():
                    # Left column - Training config
                    with gr.Column(scale=1):
                        gr.Markdown("### ⚙️ Training Configuration")
                        
                        train_dataset = gr.Dropdown(
                            choices=get_dataset_choices(),
                            label="Dataset",
                            interactive=True
                        )
                        
                        lora_name = gr.Textbox(
                            label="LoRA Name",
                            value="my-lora",
                            placeholder="my-lora"
                        )
                        
                        with gr.Row():
                            steps = gr.Slider(
                                minimum=100,
                                maximum=10000,
                                value=2500,
                                step=100,
                                label="Training Steps"
                            )
                        
                        with gr.Row():
                            resolution = gr.Radio(
                                choices=[512, 768, 1024],
                                value=512,
                                label="Resolution"
                            )
                            batch_size = gr.Slider(
                                minimum=1,
                                maximum=8,
                                value=2,
                                step=1,
                                label="Batch Size"
                            )
                        
                        learning_rate = gr.Number(
                            value=1,
                            label="Learning Rate",
                            info="Use 1 for Prodigy optimizer"
                        )
                        
                        with gr.Row():
                            start_btn = gr.Button("▶️ Start Training", variant="primary", scale=2)
                            stop_btn = gr.Button("⏹️ Stop", variant="stop", scale=1)
                        
                        training_status_text = gr.Markdown("⚪ Ready to train")
                        
                        # System info
                        gr.Markdown("---")
                        system_info = gr.Markdown(get_system_info())
                        refresh_system_btn = gr.Button("🔄 Refresh System Info", size="sm")
                    
                    # Right column - Logs
                    with gr.Column(scale=2):
                        gr.Markdown("### 📋 Training Logs")
                        
                        training_status = gr.Markdown("⚪ Idle")
                        
                        training_logs = gr.Textbox(
                            label="",
                            lines=25,
                            max_lines=30,
                            interactive=False,
                            elem_classes=["terminal"],
                            show_copy_button=True
                        )
                        
                        refresh_logs_btn = gr.Button("🔄 Refresh Logs")
                        
                        # Checkpoints section
                        gr.Markdown("### 📦 Checkpoints")
                        checkpoints_table = gr.Dataframe(
                            headers=["Filename", "Size", "Created"],
                            datatype=["str", "str", "str"],
                            col_count=(3, "fixed"),
                            interactive=False,
                            height=150
                        )
                        refresh_checkpoints_btn = gr.Button("🔄 Refresh Checkpoints", size="sm")
                
                # Training event handlers
                start_btn.click(
                    fn=start_training,
                    inputs=[train_dataset, lora_name, steps, resolution, batch_size, learning_rate],
                    outputs=[training_status_text, training_logs]
                )
                
                stop_btn.click(
                    fn=stop_training,
                    outputs=[training_status_text, training_logs]
                )
                
                refresh_logs_btn.click(
                    fn=get_training_logs,
                    outputs=[training_logs, training_status]
                )
                
                refresh_checkpoints_btn.click(
                    fn=get_checkpoints,
                    inputs=lora_name,
                    outputs=checkpoints_table
                )
                
                refresh_system_btn.click(
                    fn=get_system_info,
                    outputs=system_info
                )
                
                # Auto-refresh logs every 3 seconds when on training tab
                training_logs.change(
                    fn=lambda: None,
                    inputs=None,
                    outputs=None
                )
            
            # ================================================================
            # SETTINGS TAB
            # ================================================================
            with gr.Tab("⚙️ Settings", id="settings"):
                gr.Markdown("### 📂 Paths")
                
                gr.Textbox(value=WORKSPACE_DIR, label="Workspace Directory", interactive=False)
                gr.Textbox(value=DATASETS_DIR, label="Datasets Directory", interactive=False)
                gr.Textbox(value=OUTPUT_DIR, label="Output Directory", interactive=False)
                gr.Textbox(value=SD_SCRIPTS_DIR, label="SD-Scripts Directory", interactive=False)
                
                gr.Markdown("---")
                gr.Markdown("### ℹ️ About")
                gr.Markdown("""
                **Chroma LoRA Training UI** - Gradio Edition
                
                A simple and fast UI for training LoRA models on Chroma.
                
                - 🎨 Based on sd-scripts
                - 🚀 Uses LyCORIS/Locon
                - ⚡ Prodigy optimizer
                - 📊 TensorBoard logging
                """)
    
    return app

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    app = create_ui()
    app.launch(
        server_name="0.0.0.0",
        server_port=int(os.environ.get("PORT", 7860)),
        share=False,
        show_error=True
    )
