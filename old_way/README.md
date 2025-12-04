# 🚀 Chroma-LoRA-AutoSetup

Fully automated installation and LoRA training setup for Chroma1-HD on RTX 4090.

## 📋 Requirements

- **OS**: Linux (Ubuntu/Debian) or WSL2
- **Python**: 3.10 or newer
- **GPU**: RTX 4090 (or other NVIDIA GPU with CUDA support)
- **CUDA**: 12.1
- **Disk Space**: ~30GB free space
- **Git**: installed

## ⚡ Quick Start (Installation)

### ☁️ Recommended Environment

We highly recommend using **Vast.ai** or **RunPod**.
This setup has been primarily tested on **Vast.ai** using the **ai-toolkit** template.

To start the installation, simply run this command in the terminal:

```bash
wget -q https://raw.githubusercontent.com/r0wer/Chroma-LoRA-AutoSetup/main/setup.sh -O setup.sh && sed -i 's/\r$//' setup.sh && bash setup.sh
```

### Option 2: Clone Repository

```bash
git clone https://github.com/r0wer/Chroma-LoRA-AutoSetup.git
cd Chroma-LoRA-AutoSetup
chmod +x setup.sh
./setup.sh
```

## 📂 Structure After Installation

```
.
├── sd-scripts/                          # Main folder (created by setup.sh)
│   ├── venv/                            # Python virtual environment
│   ├── workspace/
│   │   ├── Chroma1-HD.safetensors       # Base Model
│   │   ├── t5xxl_fp16.safetensors       # Text Encoder
│   │   ├── ae.safetensors               # AutoEncoder
│   │   ├── lora_config.toml             # Dataset Configuration
│   │   ├── datasets/
│   │   │   └── goal/                    # ← ADD YOUR PHOTOS & CAPTIONS HERE
│   │   ├── output/
│   │   │   └── chroma_loras/            # ← Trained Models
│   │   └── logs/                        # TensorBoard Logs
│   ├── train.sh                         # Training Script
│   └── menu.sh                          # Interactive Menu
```

## 🎯 Usage

### Step 1: Prepare Dataset

After installation, add your training images to the dataset folder:

```bash
cd sd-scripts/workspace/datasets/goal/
```

**Dataset Structure:**
- Each image must have a corresponding `.txt` file with a caption.
- Example:
  ```
  photo1.jpg → photo1.txt
  photo2.png → photo2.txt
  ```

**Example Caption (photo1.txt):**
```
a photo of a cat sitting on a red chair, detailed fur, professional lighting
```

### Step 2: Start Training

#### Method 1: Interactive Menu (RECOMMENDED)

```bash
cd sd-scripts
./menu.sh
```

The menu offers:
- `1` - Start LoRA Training
- `2` - View Dataset (file list)
- `3` - Open Trained Models Folder
- `4` - View TensorBoard Logs
- `5` - System Information
- `6` - Refresh Menu
- `0` - Exit

#### Method 2: Direct Training

```bash
cd sd-scripts
./train.sh
```

## 🔧 Configuration

### Adjusting Training Parameters

Edit `workspace/lora_config.toml`:

```toml
[[datasets]]
resolution = [512, 512]    # Resolution (can be [768, 768] for higher quality)
batch_size = 2             # Increase to 4 if you have more VRAM
```

**Setting `num_repeats`:**
- **10-20 images**: `num_repeats = 20`
- **20-50 images**: `num_repeats = 10`
- **50-100 images**: `num_repeats = 5`
- **100+ images**: `num_repeats = 2`

### Advanced Options

Edit `train.sh` to change:
- `--max_train_steps=1500` - Total training steps
- `--network_dim=16` - LoRA dimension (16, 32, 64...)
- `--save_every_n_steps=250` - Checkpoint save frequency

## 📊 Monitoring

### TensorBoard

```bash
cd sd-scripts
source ./venv/bin/activate
tensorboard --logdir=workspace/logs
```

Open browser at: `http://localhost:6006`

## 🎁 Results

Trained models will be saved in:
```
sd-scripts/workspace/output/chroma_loras/
```

Files:
- `chroma_lora-000250.safetensors` - Checkpoint at 250 steps
- `chroma_lora.safetensors` - Final model

## ❓ FAQ

### Q: Installation takes a long time
**A:** Downloading models (~15GB) takes time. The script shows a progress bar.

### Q: CUDA out of memory error
**A:** Decrease `batch_size` in `lora_config.toml` from `2` to `1`.

### Q: How to use the trained model?
**A:** Copy the `.safetensors` file to your UI (ComfyUI, Automatic1111) into the `models/loras/` folder.

### Q: How many images do I need?
**A:** Minimum 10-15, optimally 20-50 high-quality images with good captions.

### Q: How long does training take?
**A:** ~1-2 hours for 1500 steps on an RTX 4090 (depends on dataset size).

## 🔄 Update

```bash
cd sd-scripts
git pull
pip install -r requirements.txt --upgrade
```

## 📝 License

Scripts: MIT License  
sd-scripts: See [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts)

## 🙏 Credits

- [kohya-ss](https://github.com/kohya-ss) - sd-scripts
- [lodestones](https://huggingface.co/lodestones) - Chroma1-HD model

## 💬 Support

Issues: https://github.com/r0wer/Chroma-LoRA-AutoSetup/issues

---

**Author**: r0wer  
**Version**: 1.0  
**Date**: 2025
