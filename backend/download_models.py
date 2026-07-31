"""
Downloads model artifacts from your Hugging Face Hub model repo into ml_models/<name>/.

Runs automatically during Render's build step (see the updated Build Command in
BACKEND_SETUP_GUIDE.md) — so the model is already baked into the deploy before the
app ever starts serving requests, with zero added latency at runtime.

Safe to run locally too: if the files are already present (e.g. you dropped them in
manually per the README), it skips the download entirely.

One-time setup before this script works:
  1. Create a free account at https://huggingface.co
  2. Create a new Model repo, e.g. "yourusername/smart-farming-models" (keep it Public —
     free tier is effectively unlimited storage for public repos, and there's nothing
     sensitive in model weights alone)
  3. Upload your model files into a `crop_recommendation/` folder inside that repo
     (drag-and-drop works fine on the HF website, or use `huggingface-cli upload`)
  4. Set HF_REPO_ID below to your repo
"""
import os
import shutil
from huggingface_hub import hf_hub_download

HF_REPO_ID = "your-hf-username/smart-farming-models"  # <-- change this to your actual repo

MODELS = {
    "crop_recommendation": [
        "model.pkl",
        "label_encoder.pkl",
        "metadata.json",
        "crop_profile_stats.json",
    ],
    # When Model 3 (disease detection) is ready, add it here the same way:
    # "disease_detection": ["model.tflite", "class_labels.json"],
}


def ensure_models_downloaded():
    for model_name, files in MODELS.items():
        local_dir = os.path.join("ml_models", model_name)
        os.makedirs(local_dir, exist_ok=True)

        for filename in files:
            local_path = os.path.join(local_dir, filename)
            if os.path.exists(local_path):
                print(f"[{model_name}] {filename} already present, skipping download.")
                continue

            print(f"[{model_name}] downloading {filename} from Hugging Face Hub...")
            cached_path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=f"{model_name}/{filename}",
            )
            shutil.copy(cached_path, local_path)
            print(f"[{model_name}] {filename} ready at {local_path}")

    print("All model files ready.")


if __name__ == "__main__":
    ensure_models_downloaded()
