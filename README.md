# AI-Powered Smart Farming Assistant

9th Semester Mini Project — Mobile-first (React Native + Expo + NativeWind),
Kerala-focused, with Crop Recommendation, Disease Detection, Weather,
and Market Intelligence modules.

## Structure
- `mobile/` — React Native + Expo app (NativeWind, React Navigation, TanStack Query)
- `backend/` — FastAPI backend + ML model serving
- `ml/` — training notebooks and model artifacts

## Getting started
### Mobile
    cd mobile && npm install && npx expo start

### Backend
    cd backend && source venv/bin/activate && uvicorn app.main:app --reload