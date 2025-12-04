#!/bin/bash
# Start Gradio UI for Chroma LoRA Training

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Install requirements if needed
if ! python3 -c "import gradio" 2>/dev/null; then
    echo "📦 Installing Gradio..."
    pip install -q gradio>=4.0.0 Pillow
fi

echo "🚀 Starting Chroma LoRA Training UI..."
echo "   URL: http://localhost:${PORT:-7860}"
echo ""

# Set environment variables
export DATA_DIRECTORY="${DATA_DIRECTORY:-/workspace}"
export PORT="${PORT:-7860}"

# Run the app
python3 gradio_ui.py
