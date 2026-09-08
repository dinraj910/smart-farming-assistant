# Selenium UI Testing (Expo Web)

This folder contains Selenium automation for the Smart Farming Assistant web build.

## Covered test cases
- TC1 Register with valid data
- TC2 Register with password mismatch
- TC3 Login with wrong password
- TC4 Login with valid credentials
- TC5 Farms page load
- TC6 Add Plot validation (empty name)
- TC7 Add Plot success
- TC8 Open plot details
- TC9 Agent chat send flow (user + assistant messages)
- TC10 Sign out flow

## Prerequisites
1. Python 3.10+
2. Chrome installed
3. Backend running:
   - `cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/backend`
   - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
4. Mobile web app running:
   - `cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile`
   - `npm install`
   - `npm run web`

## Install Selenium dependency
```bash
cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/testing/selenium
python -m pip install -r requirements.txt
```

## Run all tests
```bash
cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/testing/selenium
python run_all.py
```

## Useful environment variables
- `SELENIUM_APP_URL` (default: `http://localhost:8081`)
- `SELENIUM_HEADLESS` (`1` headless, `0` headed)
- `SELENIUM_TIMEOUT` (default: `25` seconds)
- `SELENIUM_TEST_PASSWORD` (default: `Pass1234!`)

## Evidence and outputs
- Failure screenshots: `testing/selenium/artifacts/*.png`
- Result files:
  - `testing/selenium/artifacts/selenium_results_<timestamp>.json`
  - `testing/selenium/artifacts/selenium_results_<timestamp>.csv`

These outputs can be attached directly in your college testing report.
