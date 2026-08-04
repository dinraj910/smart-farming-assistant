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
    cd mobile 

    npx expo start -c

### Backend
    cd backend 

    uvicorn main:app --reload --host 0.0.0.0 --port 8000

## Agentic AI (Powered by Llama 3 via Groq)
The backend features an AI orchestrator that routes conversational user queries to specialized farming tools using function calling:
- **Crop Recommendation**: Wraps the ML model to predict optimal crops based on soil conditions.
- **Yield Prediction**: Predicts crop yield per hectare based on historical data.
- **Calendar & Companion**: Suggests optimal planting windows and compatible companion crops.
- **KAU Knowledge Search (RAG)**: Vector database search (via PostgreSQL/pgvector) for out-of-distribution crops using data from the Kerala Agricultural University.
- **Weather Tool**: Fetches live weather forecasts via Open-Meteo.
- **Market Price Tool**: Fetches live and seasonal commodity pricing from Agmarknet and CommodityOnline (Kerala-specific).

### Testing the Agent
To test the agent directly from the backend without the UI, you can use the built-in testing scripts:
```bash
# Test individual tools in isolation
python backend/test_tools.py

# Test the full LLM conversational routing loop
python backend/test_agent.py
```