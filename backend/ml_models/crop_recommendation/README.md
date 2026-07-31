# Drop your trained model files here

From the Colab notebook's export step (`crop_recommendation_model.zip`), extract and place these
four files directly in this folder:

- model.pkl
- label_encoder.pkl
- metadata.json
- crop_profile_stats.json   (see the notebook addendum snippet to generate this one)

The backend will refuse to start (with a clear file-not-found error) if any of these are missing —
that's intentional, so a missing model file fails loudly at startup, not silently mid-demo.
