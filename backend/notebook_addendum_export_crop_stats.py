# ============================================================
# ADD THIS CELL to your crop_recommendation_training.ipynb,
# right after the "Export Model" section, before zipping/downloading.
#
# Why: the backend's explain_prediction logic needs per-crop feature
# mean/std to generate "why this crop?" text — it can't ship your
# entire training set, so we export just the small summary stats.
# ============================================================

crop_profile_stats = {}
y_train_labels_full = le.inverse_transform(y_train)

for crop_name in le.classes_:
    crop_rows = X_train[y_train_labels_full == crop_name]
    crop_profile_stats[crop_name] = {
        col: {"mean": float(crop_rows[col].mean()), "std": float(crop_rows[col].std())}
        for col in X_train.columns
    }

with open("crop_recommendation_model/crop_profile_stats.json", "w") as f:
    json.dump(crop_profile_stats, f, indent=2)

print("crop_profile_stats.json exported — re-zip crop_recommendation_model/ before downloading.")
