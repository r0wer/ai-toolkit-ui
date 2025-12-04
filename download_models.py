import os
import requests

import sys

# Configuration
MODELS = [
    {
        "url": "https://huggingface.co/lodestones/Chroma1-HD/resolve/main/Chroma1-HD.safetensors",
        "filename": "Chroma1-HD.safetensors",
        "name": "Chroma1-HD"
    },
    {
        "url": "https://huggingface.co/UmeAiRT/ComfyUI-Auto_installer/resolve/df511f9f086b2f12e3a81471831ccb23969d8461/t5xxl_fp16.safetensors",
        "filename": "t5xxl_fp16.safetensors",
        "name": "T5XXL FP16"
    },
    {
        "url": "https://huggingface.co/receptektas/black-forest-labs-ae_safetensors/resolve/main/ae.safetensors",
        "filename": "ae.safetensors",
        "name": "VAE (AutoEncoder)"
    }
]

WORKSPACE_DIR = os.environ.get("DATA_DIRECTORY", "/workspace")
HF_TOKEN = os.environ.get("HF_TOKEN")

def download_file(url, dest, name):
    if os.path.exists(dest):
        # Check if file is not empty (simple check)
        if os.path.getsize(dest) > 1024 * 1024: # > 1MB
            print(f"✓ {name} already exists at {dest}")
            return
        else:
            print(f"⚠️ {name} exists but is too small. Re-downloading...")
            os.remove(dest)

    print(f"⬇️  Downloading {name}...")
    
    headers = {}
    if "huggingface.co" in url and HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    try:
        response = requests.get(url, stream=True, headers=headers)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024 # 1 Kibibyte
        
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        
        print(f"   Total size: {total_size / (1024*1024):.2f} MB")
        
        downloaded = 0
        last_print = 0
        with open(dest, 'wb') as file:
            for data in response.iter_content(block_size):
                size = file.write(data)
                downloaded += size
                if total_size > 0:
                    percent = int(downloaded / total_size * 100)
                    if percent >= last_print + 10: # Print every 10%
                        print(f"   ...{percent}% ({downloaded / (1024*1024):.2f} MB)")
                        last_print = percent
        print(f"✓ {name} downloaded successfully.")
        
    except requests.exceptions.HTTPError as err:
        if err.response.status_code == 401:
             print(f"❌ Error downloading {name}: 401 Unauthorized. Please check if this model requires an HF_TOKEN.")
        elif err.response.status_code == 403:
             print(f"❌ Error downloading {name}: 403 Forbidden. You may not have access to this model.")
        else:
             print(f"❌ Error downloading {name}: {err}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ An error occurred while downloading {name}: {e}")
        sys.exit(1)

def main():
    print("=========================================================================")
    print("===                  MODEL DOWNLOADER                                 ===")
    print("=========================================================================")
    print(f"Workspace Directory: {WORKSPACE_DIR}")
    
    # Ensure workspace directory exists
    os.makedirs(WORKSPACE_DIR, exist_ok=True)
    
    for model in MODELS:
        dest_path = os.path.join(WORKSPACE_DIR, model["filename"])
        download_file(model["url"], dest_path, model["name"])
        
    print("\n✓ All models processed.")

if __name__ == "__main__":
    main()
