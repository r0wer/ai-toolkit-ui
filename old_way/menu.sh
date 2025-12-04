#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if we are in the sd-scripts folder
if [ ! -d "venv" ] || [ ! -f "flux_train_network.py" ]; then
    echo -e "${RED}❌ Error: Run this script from the sd-scripts folder!${NC}"
    echo -e "${YELLOW}   cd sd-scripts && ./menu.sh${NC}"
    exit 1
fi

# Function to refresh dataset stats
refresh_stats() {
    DATASET_DIR="workspace/datasets/goal"
    if [ -d "$DATASET_DIR" ]; then
        IMAGE_COUNT=$(find "$DATASET_DIR" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) 2>/dev/null | wc -l)
        CAPTION_COUNT=$(find "$DATASET_DIR" -type f -name "*.txt" 2>/dev/null | wc -l)
    else
        IMAGE_COUNT=0
        CAPTION_COUNT=0
    fi

    OUTPUT_DIR="workspace/output/chroma_loras"
    if [ -d "$OUTPUT_DIR" ]; then
        MODEL_COUNT=$(find "$OUTPUT_DIR" -type f -name "*.safetensors" 2>/dev/null | wc -l)
    else
        MODEL_COUNT=0
    fi
}

# Menu function
show_menu() {
    refresh_stats
    clear
    echo -e "${CYAN}=========================================================================${NC}"
    echo -e "${CYAN}===           ${GREEN}CHROMA1-HD LORA TRAINING - MENU${CYAN}                        ===${NC}"
    echo -e "${CYAN}=========================================================================${NC}"
    echo ""
    echo -e "${BLUE}📁 LOCATION:${NC} $(pwd)"
    echo ""
    echo -e "${BLUE}📊 DATASET STATUS:${NC}"
    if [ "$IMAGE_COUNT" -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} Images:   ${GREEN}$IMAGE_COUNT${NC} files"
        echo -e "  ${GREEN}✓${NC} Captions: ${GREEN}$CAPTION_COUNT${NC} files"
    else
        echo -e "  ${RED}✗${NC} Images:   ${RED}0${NC} files ${RED}(MISSING!)${NC}"
        echo -e "  ${RED}✗${NC} Captions: ${RED}0${NC} files"
    fi
    echo ""
    if [ "$MODEL_COUNT" -gt 0 ]; then
        echo -e "${BLUE}🎯 TRAINED MODELS:${NC} ${GREEN}$MODEL_COUNT${NC} models in $OUTPUT_DIR"
        echo ""
    fi
    echo -e "${CYAN}=========================================================================${NC}"
    echo -e "${YELLOW}   SELECT OPTION:${NC}"
    echo -e "${CYAN}=========================================================================${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC} - ${BLUE}Start LoRA Training${NC}"
    echo -e "  ${GREEN}2${NC} - ${BLUE}View Dataset (file list)${NC}"
    echo -e "  ${GREEN}3${NC} - ${BLUE}Open Trained Models Folder${NC}"
    echo -e "  ${GREEN}4${NC} - ${BLUE}View TensorBoard Logs${NC}"
    echo -e "  ${GREEN}5${NC} - ${BLUE}System Information${NC}"
    echo -e "  ${GREEN}6${NC} - ${BLUE}Refresh Menu${NC}"
    echo ""
    echo -e "  ${RED}0${NC} - ${RED}Exit${NC}"
    echo ""
    echo -e "${CYAN}=========================================================================${NC}"
    echo -n -e "${YELLOW}Choice: ${NC}"
}

# Training function
start_training() {
    refresh_stats
    if [ "$IMAGE_COUNT" -eq 0 ]; then
        echo ""
        echo -e "${RED}❌ ERROR: No images in dataset!${NC}"
        echo -e "${YELLOW}Checking again...${NC}"
        sleep 1
        refresh_stats
        if [ "$IMAGE_COUNT" -eq 0 ]; then
             echo -e "${RED}Still no images found.${NC}"
             echo -e "${YELLOW}Add images and captions to: $(pwd)/$DATASET_DIR/${NC}"
             echo ""
             read -p "Press ENTER to return to menu (and refresh)..."
             return
        else
             echo -e "${GREEN}✓ Images found! Starting...${NC}"
             sleep 1
        fi
    fi
    
    clear
    echo -e "${GREEN}=========================================================================${NC}"
    echo -e "${GREEN}===                 STARTING TRAINING                                ===${NC}"
    echo -e "${GREEN}=========================================================================${NC}"
    echo ""
    
    ./train.sh
    
    echo ""
    read -p "Training finished. Press ENTER to return to menu..."
}

# Show dataset function
show_dataset() {
    clear
    echo -e "${CYAN}=========================================================================${NC}"
    echo -e "${CYAN}===                    DATASET CONTENT                               ===${NC}"
    echo -e "${CYAN}=========================================================================${NC}"
    echo ""
    
    if [ "$IMAGE_COUNT" -eq 0 ]; then
        echo -e "${RED}No files in dataset!${NC}"
        echo -e "${YELLOW}Folder: $(pwd)/$DATASET_DIR/${NC}"
    else
        echo -e "${GREEN}Images:${NC}"
        find "$DATASET_DIR" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) | sed 's/^/  • /'
        echo ""
        echo -e "${GREEN}Captions:${NC}"
        find "$DATASET_DIR" -type f -name "*.txt" | sed 's/^/  • /'
    fi
    
    echo ""
    read -p "Press ENTER to return to menu..."
}

# Open models folder function
open_models_folder() {
    clear
    echo -e "${CYAN}=========================================================================${NC}"
    echo -e "${CYAN}===                 TRAINED MODELS                                   ===${NC}"
    echo -e "${CYAN}=========================================================================${NC}"
    echo ""
    
    if [ "$MODEL_COUNT" -eq 0 ]; then
        echo -e "${RED}No trained models yet!${NC}"
        echo -e "${YELLOW}Folder: $(pwd)/$OUTPUT_DIR/${NC}"
    else
        echo -e "${GREEN}Found models:${NC}"
        find "$OUTPUT_DIR" -type f -name "*.safetensors" -exec ls -lh {} \; | awk '{print "  • " $9 " (" $5 ")"}'
        echo ""
        echo -e "${BLUE}Location:${NC} $(pwd)/$OUTPUT_DIR/"
    fi
    
    echo ""
    read -p "Press ENTER to return to menu..."
}

# TensorBoard function
show_tensorboard() {
    clear
    echo -e "${CYAN}=========================================================================${NC}"
    echo -e "${CYAN}===                    TENSORBOARD LOGS                              ===${NC}"
    echo -e "${CYAN}=========================================================================${NC}"
    echo ""
    echo -e "${YELLOW}To run TensorBoard, use command:${NC}"
    echo ""
    echo -e "  ${GREEN}source ./venv/bin/activate${NC}"
    echo -e "  ${GREEN}tensorboard --logdir=workspace/logs${NC}"
    echo ""
    echo -e "${YELLOW}Then open browser at:${NC} ${BLUE}http://localhost:6006${NC}"
    echo ""
    read -p "Press ENTER to return to menu..."
}

# System info function
show_system_info() {
    clear
    echo -e "${CYAN}=========================================================================${NC}"
    echo -e "${CYAN}===                 SYSTEM INFORMATION                               ===${NC}"
    echo -e "${CYAN}=========================================================================${NC}"
    echo ""
    
    source ./venv/bin/activate
    
    echo -e "${GREEN}Python:${NC}"
    python --version | sed 's/^/  /'
    echo ""
    
    echo -e "${GREEN}GPU:${NC}"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | sed 's/^/  /'
    echo ""
    
    echo -e "${GREEN}CUDA:${NC}"
    nvcc --version | grep "release" | sed 's/^/  /'
    echo ""
    
    echo -e "${GREEN}Key Packages:${NC}"
    pip list | grep -E "torch|xformers|prodigy|lycoris" | sed 's/^/  /'
    echo ""
    
    read -p "Press ENTER to return to menu..."
}

# Main menu loop
while true; do
    show_menu
    read choice
    
    case $choice in
        1)
            start_training
            ;;
        2)
            show_dataset
            ;;
        3)
            open_models_folder
            ;;
        4)
            show_tensorboard
            ;;
        5)
            show_system_info
            ;;
        6)
            # Just loop again to refresh
            ;;
        0)
            clear
            echo -e "${GREEN}See you later!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice!${NC}"
            sleep 1
            ;;
    esac
done
