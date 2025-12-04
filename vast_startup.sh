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

# Install Python dependencies if requirements.txt exists
if [ -f "${REPO_DIR}/requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r "${REPO_DIR}/requirements.txt"
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

# User can configure startup by removing the reference in /etc/portal.yaml - So wait for that file and check it
while [ ! -f "$(realpath -q /etc/portal.yaml 2>/dev/null)" ]; do
    echo "Waiting for /etc/portal.yaml before starting \${PROC_NAME}..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
    sleep 1
done

echo "Starting AI Toolkit UI..." | tee -a "/var/log/portal/\${PROC_NAME}.log"

# Load NVM to get node/npm
if [ -f "/opt/nvm/nvm.sh" ]; then
    . /opt/nvm/nvm.sh
fi

cd "${REPO_DIR}"

# Install Node dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "Installing Node modules..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
    npm install 2>&1 | tee -a "/var/log/portal/\${PROC_NAME}.log"
fi

# Check for port conflicts
echo "Checking port 18675..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
if netstat -tuln | grep -q ":18675 "; then
    echo "Port 18675 is in use. Attempting to identify and kill..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
    fuser -k 18675/tcp || true
    sleep 2
fi

# Build if needed
if [ ! -d ".next" ]; then
    echo "Building Next.js app..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
    npm run build 2>&1 | tee -a "/var/log/portal/\${PROC_NAME}.log"
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
    pip install torch==2.5.1+cu121 torchvision==0.20.1+cu121 --index-url https://download.pytorch.org/whl/cu121
    pip install xformers --index-url https://download.pytorch.org/whl/cu121
    pip install -r requirements.txt
    pip install prodigy-plus-schedule-free lycoris-lora
    
    # Go back to UI dir
    cd "${REPO_DIR}"
fi

# Start
echo "Starting Next.js app..." | tee -a "/var/log/portal/\${PROC_NAME}.log"

# Ensure port 18675 is free
echo "Checking port 18675..." | tee -a "/var/log/portal/\${PROC_NAME}.log"
fuser -k 18675/tcp || true
sleep 2

npm run start 2>&1 | tee -a "/var/log/portal/\${PROC_NAME}.log"

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
