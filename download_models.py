import os
import sys
import requests
from tqdm import tqdm

MODELS = {
    "Chroma1-HD.safetensors": {
        "url": "https://huggingface.co/chroma-weights/Chroma1-HD/resolve/main/Chroma1-HD.safetensors?download=true",
        "min_size": 5 * 1024 * 1024 * 1024  # 5GB
    },
    "t5xxl_fp16.safetensors": {
        "url": "https://huggingface.co/chroma-weights/Chroma1-HD/resolve/main/t5xxl_fp16.safetensors?download=true",
        "min_size": 4 * 1024 * 1024 * 1024  # 4GB
    },
    "ae.safetensors": {
        "url": "https://huggingface.co/chroma-weights/Chroma1-HD/resolve/main/ae.safetensors?download=true",
        "min_size": 100 * 1024 * 1024  # 100MB
    }
}

WORKSPACE_DIR = os.environ.get("DATA_DIRECTORY", "/workspace")

def download_file(url, filepath):
    print(f"Downloading {os.path.basename(filepath)}...")
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    with open(filepath, 'wb') as f, tqdm(
        desc=os.path.basename(filepath),
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024):
            size = f.write(data)
            bar.update(size)

def check_and_download():
    print("Checking models...")
    for filename, info in MODELS.items():
        filepath = os.path.join(WORKSPACE_DIR, filename)
        
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            if size < info["min_size"]:
                print(f"File {filename} is too small ({size} bytes). Deleting and redownloading...")
                os.remove(filepath)
            else:
                print(f"File {filename} exists and size is OK.")
                continue
        
        download_file(info["url"], filepath)

if __name__ == "__main__":
    check_and_download()
