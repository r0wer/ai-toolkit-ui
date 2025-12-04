import os
import requests
from tqdm import tqdm
import sys

# Configuration
MODELS = [
    {
        "url": "https://huggingface.co/lodestones/Chroma1-HD/resolve/main/Chroma1-HD.safetensors",
        "dest": "workspace/Chroma1-HD.safetensors",
        "name": "Chroma1-HD"
    },
    {
        "url": "https://huggingface.co/UmeAiRT/ComfyUI-Auto_installer/resolve/df511f9f086b2f12e3a81471831ccb23969d8461/t5xxl_fp16.safetensors",
        "dest": "workspace/t5xxl_fp16.safetensors",
        "name": "T5XXL FP16"
    },
    {
        "url": "https://huggingface.co/receptektas/black-forest-labs-ae_safetensors/resolve/main/ae.safetensors",
        "dest": "workspace/ae.safetensors",
        "name": "VAE (AutoEncoder)"
    }
]

# Optional: HF Token if needed for private models
# The user requested to remove the hardcoded token.
# It will now only be used if explicitly set in the environment.
HF_TOKEN = os.environ.get("HF_TOKEN")

def download_file(url, dest, name):
    if os.path.exists(dest):
        print(f"✓ {name} already exists at {dest}")
        return

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
        
        with open(dest, 'wb') as file, tqdm(
            desc=name,
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for data in response.iter_content(block_size):
                size = file.write(data)
                bar.update(size)
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
    
    # Ensure workspace directory exists
    os.makedirs("workspace", exist_ok=True)
    
    for model in MODELS:
        download_file(model["url"], model["dest"], model["name"])
        
    print("\n✓ All models processed.")

if __name__ == "__main__":
    main()
