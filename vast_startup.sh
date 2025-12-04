#!/bin/bash

set -euo pipefail

# Vast.ai environment setup
if [ -f "/venv/main/bin/activate" ]; then
    . /venv/main/bin/activate
fi

# Define workspace and repo paths
WORKSPACE="${WORKSPACE:-/workspace}"
export DATA_DIRECTORY="${WORKSPACE}"
REPO_DIR="${WORKSPACE}/ai-toolkit-ui"

# Ensure we are in the workspace
cd "$WORKSPACE"

# Install Python dependencies for Gradio App
if [ -f "${REPO_DIR}/gradio_new/requirements.txt" ]; then
    echo "Installing Gradio dependencies..."
    pip install -r "${REPO_DIR}/gradio_new/requirements.txt"
fi

# Create the startup script for the UI
mkdir -p /opt/supervisor-scripts
cat > /opt/supervisor-scripts/ai-toolkit-ui.sh << EOF
#!/bin/bash

kill_subprocesses() {
    local pid=\$1
    local subprocesses=\$(pgrep -P "\$pid")
    
    for process in \$subprocesses; do
        kill_subprocesses "\$process"
    done
    
    if [[ -n "\$subprocesses" ]]; then
        kill -TERM \$subprocesses 2>/dev/null
    fi
}

cleanup() {
    kill_subprocesses \$\$
    sleep 2
    pkill -KILL -P \$\$ 2>/dev/null
    exit 0
}

trap cleanup EXIT INT TERM

# Create log directory
mkdir -p /var/log/portal

# User can configure startup by removing the reference in /etc/portal.yaml
while [ ! -f "$(realpath -q /etc/portal.yaml 2>/dev/null)" ]; do
    echo "Waiting for /etc/portal.yaml before starting \${PROC_NAME}..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
    sleep 1
done

echo "Starting AI Toolkit UI (Gradio)..." | tee -a "/var/log/portal/\${PROC_NAME}.log"

# Check for port conflicts (18675)
echo "Checking port 18675..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
if netstat -tuln | grep -q ":18675 "; then
    echo "Port 18675 is in use. Attempting to identify and kill..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
    fuser -k 18675/tcp || true
    sleep 2
fi

# Ensure sd-scripts is installed (logic from setup.sh)
if [ ! -d "${WORKSPACE}/sd-scripts" ]; then
    echo "Installing sd-scripts..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
    cd "${WORKSPACE}"
    git clone https://github.com/kohya-ss/sd-scripts.git
    cd sd-scripts
    git checkout sd3
    
    # Create venv if not exists
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    . venv/bin/activate
    
    # Install dependencies
    pip install torch==2.5.1+cu121 torchvision==0.20.1+cu121 torchaudio==2.5.1+cu121 --index-url https://download.pytorch.org/whl/cu121
    pip install xformers --index-url https://download.pytorch.org/whl/cu121
    pip install huggingface_hub
    pip install -r requirements.txt
    pip install prodigy-plus-schedule-free lycoris-lora requests tqdm
    
    # Go back to UI dir
    cd "${REPO_DIR}"
fi

# Start Gradio App
echo "Starting Gradio app..." | tee -a "/var/log/portal/\${PROC_NAME}.log"

cd "${REPO_DIR}/gradio_new"
export PORT=18675
python app.py 2>&1 | tee -a "/var/log/portal/\${PROC_NAME}.log"

EOF

chmod +x /opt/supervisor-scripts/ai-toolkit-ui.sh

# Create Supervisor configuration
cat > /etc/supervisor/conf.d/ai-toolkit-ui.conf << EOF
[program:ai-toolkit-ui]
environment=PROC_NAME="%(program_name)s"
command=/opt/supervisor-scripts/ai-toolkit-ui.sh
autostart=true
autorestart=true
exitcodes=0
startsecs=0
stopasgroup=true
killasgroup=true
stopsignal=TERM
stopwaitsecs=10
stdout_logfile=/dev/stdout
redirect_stderr=true
stdout_events_enabled=true
stdout_logfile_maxbytes=0
stdout_logfile_backups=0
EOF

# Reload supervisor to start the service
echo "Reloading supervisor..."
supervisorctl reread
supervisorctl update
