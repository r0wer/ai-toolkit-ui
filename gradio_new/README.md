# Chroma LoRA Training UI - Gradio Edition

This is a fresh, simplified implementation of the Chroma LoRA Training UI using Gradio.
It is designed to be robust, easy to use, and visually similar to the Next.js dashboard.

## Features

- **Modern UI**: Clean, dashboard-style interface.
- **Dataset Management**: Create datasets, upload images, and view galleries.
- **Training**: Configure and run LoRA training with real-time logs.
- **System Monitoring**: View GPU and Disk usage.

## How to Run

1.  Double-click `run.bat`
    OR
2.  Run manually:
    ```bash
    pip install -r requirements.txt
    python app.py
    ```

## Directory Structure

- `app.py`: Main application logic.
- `requirements.txt`: Python dependencies.
- `../datasets`: Shared datasets directory.
- `../output`: Shared output directory for trained models.
