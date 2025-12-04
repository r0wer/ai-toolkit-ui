#!/bin/bash
set -e  # Stop on error

# Check if we are in the sd-scripts folder
if [ ! -d "venv" ] || [ ! -f "flux_train_network.py" ]; then
    echo "❌ Error: Run this script from the sd-scripts folder!"
    echo "   cd sd-scripts && ./train.sh"
    exit 1
fi

echo "========================================================================="
echo "===            Starting Chroma1-HD LoRA Training                     ==="
echo "========================================================================="
echo ""

# Activate virtual environment
source ./venv/bin/activate

# Disable tokenizers warning
export TOKENIZERS_PARALLELISM=false

# Check if dataset is not empty
DATASET_DIR="workspace/datasets/goal"
IMAGE_COUNT=$(find "$DATASET_DIR" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) 2>/dev/null | wc -l)

if [ "$IMAGE_COUNT" -eq 0 ]; then
    echo "❌ ERROR: No images in dataset!"
    echo "   Add images to: $(pwd)/$DATASET_DIR/"
    exit 1
fi

echo "✓ Found $IMAGE_COUNT images in dataset"
echo "✓ Starting training..."
echo ""

accelerate launch --num_cpu_threads_per_process 2 \
  flux_train_network.py \
  --seed 1337 \
  --pretrained_model_name_or_path="workspace/Chroma1-HD.safetensors" \
  --model_type=chroma \
  --t5xxl="workspace/t5xxl_fp16.safetensors" \
  --ae="workspace/ae.safetensors" \
  --dataset_config="workspace/lora_config.toml" \
  --output_dir="workspace/output/chroma_loras" \
  --output_name="chroma_lora" \
  --save_model_as=safetensors \
  --network_module=lycoris.kohya \
  --network_dim=16 \
  --network_alpha=1 \
  --network_args "algo=locon" "preset=full" "dropout=0.1" "dora_wd=true" \
  --learning_rate=1 \
  --optimizer_type="prodigyplus.ProdigyPlusScheduleFree" \
  --optimizer_args "d_coef=1" "use_bias_correction=True" "betas=(0.98,0.99)" "use_speed=True" \
  --lr_scheduler="constant_with_warmup" \
  --lr_warmup_steps=200 \
  --sdpa \
  --max_train_steps=2500 \
  --save_every_n_steps=250 \
  --model_prediction_type=raw \
  --mixed_precision="bf16" \
  --full_bf16 \
  --gradient_checkpointing \
  --gradient_accumulation=1 \
  --guidance_scale=0.0 \
  --timestep_sampling="sigmoid" \
  --sigmoid_scale=1.0 \
  --apply_t5_attn_mask \
  --network_dropout=0.1 \
  --network_train_unet_only \
  --enable_bucket \
  --min_bucket_reso=256 \
  --max_bucket_reso=768 \
  --persistent_data_loader_workers \
  --max_data_loader_n_workers=2 \
  --noise_offset=0.07 \
  --min_snr_gamma=5 \
  --multires_noise_iterations=6 \
  --multires_noise_discount=0.3 \
  --zero_terminal_snr \
  --v_parameterization \
  --cache_latents_to_disk \
  --cache_text_encoder_outputs_to_disk \
  --logging_dir="workspace/logs" \
  --log_with=tensorboard \
  --log_config \
  --save_precision=fp16 \
  --save_state

echo ""
echo "========================================================================="
echo "===                  TRAINING FINISHED!                              ==="
echo "========================================================================="
echo ""
echo "📁 Trained models are located in:"
echo "   $(pwd)/workspace/output/chroma_loras/"
echo ""
echo "📊 TensorBoard Logs:"
echo "   $(pwd)/workspace/logs/"
echo ""
echo "🔍 To view logs in real-time, use:"
echo "   tensorboard --logdir=workspace/logs"
echo ""
echo "========================================================================="
