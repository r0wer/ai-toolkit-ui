#!/bin/bash
set -e  # Stop script on error

echo "========================================================================="
echo "=== Auto-Install SD-Scripts for Chroma1-HD (RTX 4090) ==="
echo "========================================================================="
echo ""

# Ensure we are in the home directory or appropriate location
# cd ~

# Install system dependencies (if required)
echo "Checking system dependencies..."
if command -v apt-get &> /dev/null; then
    # Check if we have root privileges (sudo)
    if [ "$EUID" -ne 0 ]; then
        sudo apt-get update && sudo apt-get install -y python3-venv python3-pip git wget
    else
        apt-get update && apt-get install -y python3-venv python3-pip git wget
    fi
fi

# Check if Python 3.10+ is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3.10 or newer is required"
    exit 1
fi
echo "✓ Python found: $(python3 --version)"

# GitHub repo with config files
GITHUB_REPO="https://raw.githubusercontent.com/r0wer/Chroma-LoRA-AutoSetup/main"

# ============================================================================
# STEP 1: Clone sd-scripts repository
# ============================================================================
if [ -d "sd-scripts" ]; then
    echo ""
    echo "STEP 1: sd-scripts folder already exists, updating..."
    cd sd-scripts
    git checkout sd3 2>/dev/null || git checkout -b sd3
    git pull
else
    echo ""
    echo "STEP 1: Cloning sd-scripts repository..."
    git clone https://github.com/kohya-ss/sd-scripts.git
    cd sd-scripts
    echo "  Switching to branch sd3..."
    git checkout sd3
fi

# ============================================================================
# STEP 2: Download config files DIRECTLY to destination
# ============================================================================
echo ""
echo "STEP 2: Downloading config files directly to destination..."

# Create workspace folder first
mkdir -p workspace

if [ ! -f "workspace/lora_config.toml" ]; then
    wget -q "${GITHUB_REPO}/lora_config.toml" -O workspace/lora_config.toml && echo "  ✓ workspace/lora_config.toml downloaded"
else
    echo "  ✓ workspace/lora_config.toml already exists"
fi

if [ ! -f "train.sh" ]; then
    wget -q "${GITHUB_REPO}/train.sh" -O train.sh && chmod +x train.sh && echo "  ✓ train.sh downloaded"
else
    echo "  ✓ train.sh already exists"
fi

if [ ! -f "menu.sh" ]; then
    wget -q "${GITHUB_REPO}/menu.sh" -O menu.sh && chmod +x menu.sh && echo "  ✓ menu.sh downloaded"
else
    echo "  ✓ menu.sh already exists"
fi

# Download model downloader script (temporary, will remove after use)
if [ ! -f "download_models.py" ]; then
    wget -q "${GITHUB_REPO}/download_models.py" -O download_models.py && echo "  ✓ download_models.py downloaded"
else
    echo "  ✓ download_models.py already exists"
fi

# ============================================================================
# STEP 3: Virtual environment
# ============================================================================
if [ -d "venv" ]; then
    echo ""
    echo "STEP 3: Virtual environment already exists"
else
    echo ""
    echo "STEP 3: Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
echo ""
echo "STEP 4: Activating virtual environment..."
source ./venv/bin/activate

# ============================================================================
# STEP 5: PyTorch + xformers
# ============================================================================
TORCH_INSTALLED=$(pip list | grep "^torch " || echo "not_found")
if [[ "$TORCH_INSTALLED" == "not_found" ]]; then
    echo ""
    echo "STEP 5: Installing PyTorch 2.5.1 with CUDA 12.1 (RTX 4090)..."
    pip install torch==2.5.1+cu121 torchvision==0.20.1+cu121 --index-url https://download.pytorch.org/whl/cu121
    echo "  Installing xformers..."
    pip install xformers --index-url https://download.pytorch.org/whl/cu121
else
    echo ""
    echo "✓ PyTorch already installed: $TORCH_INSTALLED"
fi

# ============================================================================
# STEP 6: Requirements
# ============================================================================
echo ""
echo "STEP 6: Installing required libraries..."
pip install -r requirements.txt
# Install libraries for downloader script
pip install requests tqdm

# ============================================================================
# STEP 7: Prodigy+
# ============================================================================
PRODIGY_INSTALLED=$(pip list | grep "prodigy-plus-schedule-free" || echo "not_found")
if [[ "$PRODIGY_INSTALLED" == "not_found" ]]; then
    echo ""
    echo "STEP 7: Installing Prodigy+ optimizer..."
    pip install prodigy-plus-schedule-free
else
    echo ""
    echo "✓ Prodigy+ already installed: $PRODIGY_INSTALLED"
fi

# ============================================================================
# STEP 8: LyCORIS (for DoRA)
# ============================================================================
LYCORIS_INSTALLED=$(pip list | grep "lycoris-lora" || echo "not_found")
if [[ "$LYCORIS_INSTALLED" == "not_found" ]]; then
    echo ""
    echo "STEP 8: Installing LyCORIS (DoRA support)..."
    pip install lycoris-lora
else
    echo ""
    echo "✓ LyCORIS already installed: $LYCORIS_INSTALLED"
fi

# ============================================================================
# STEP 9: Creating folders
# ============================================================================
echo ""
echo "STEP 9: Creating folder structure..."
mkdir -p workspace/datasets/goal
mkdir -p workspace/output/chroma_loras
mkdir -p workspace/logs
echo "  ✓ Folders created"

# ============================================================================
# STEP 10: Downloading models (Python Script)
# ============================================================================
echo ""
echo "STEP 10: Downloading models using Python script..."
# Run download script
python download_models.py

# Remove downloader script after use to keep it clean
rm download_models.py
echo "  ✓ download_models.py removed"

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "========================================================================="
echo "===                  INSTALLATION COMPLETE!                          ==="
echo "========================================================================="
echo ""
echo "📁 LOCATION: $(pwd)"
echo ""
echo "📂 FOLDER STRUCTURE:"
echo "  • Models:    $(pwd)/workspace/"
echo "  • Dataset:   $(pwd)/workspace/datasets/goal/"
echo "  • Output:    $(pwd)/workspace/output/chroma_loras/"
echo "  • Logs:      $(pwd)/workspace/logs/"
echo ""
echo "📦 INSTALLED PACKAGES:"
pip list | grep -E "torch|xformers|prodigy|lycoris" | sed 's/^/  • /'
echo ""
echo "⚙️  SPECIFICATION:"
echo "  • GPU:       RTX 4090"
echo "  • CUDA:      12.1"
echo "  • PyTorch:   2.5.1"
echo "  • Precision: BF16 + FP16"
echo ""
echo "========================================================================="
echo "                         NEXT STEPS"
echo "========================================================================="
echo ""
echo "1️⃣  Add training photos:"
echo "    cd $(pwd)/workspace/datasets/goal/"
echo "    (copy .jpg/.png files and .txt captions here)"
echo ""
echo "2️⃣  Run training menu:"
echo "    cd $(pwd)"
echo "    ./menu.sh"
echo ""
echo "    OR run training directly:"
echo "    ./train.sh"
echo ""
echo "========================================================================="
echo ""
echo "🚀 Launching menu automatically in 3 seconds..."
sleep 3

# Automatically launch menu
./menu.sh
