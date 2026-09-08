# Selenium UI Testing (Expo Web)

This file documents **all Selenium/testing changes** added for this project and the exact commands to run them.

## 1) What was changed for Selenium support

### A. Stable UI selectors (`testID`) were added
These selectors make React Native Expo Web elements reliably automatable with Selenium.

Updated files:
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/screens/WelcomeScreen.tsx`
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/screens/Auth/LoginScreen.tsx`
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/screens/Auth/RegisterScreen.tsx`
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/components/FloatingTabBar.tsx`
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/screens/FarmsScreen.tsx`
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/screens/AgentSelectScreen.tsx`
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/screens/FieldDetailScreen.tsx`
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile/src/screens/AgentChatScreen.tsx`

### B. Selenium automation suite was added (TC1–TC10)
Main folder:
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/testing/selenium`

Key files:
- `selenium_helpers.py` (driver setup, waits, screenshot capture, helper actions)
- `run_all.py` (single command runner for all test cases)
- `requirements.txt` (Selenium dependency)
- `tests/tc01_...` to `tests/tc10_...` (one script per test case)

### C. Testing report template was added
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/docs/testing/selenium_test_report_template.md`

---

## 2) Test coverage (TC1–TC10)
- **TC1** Register with valid data
- **TC2** Register with password mismatch
- **TC3** Login with wrong password
- **TC4** Login with valid credentials
- **TC5** Farms page load
- **TC6** Add plot validation (empty name)
- **TC7** Add plot success
- **TC8** Open plot details
- **TC9** Agent chat send flow (user message + assistant message)
- **TC10** Sign out flow

---

## 3) Commands to run (step-by-step)

### Step 1: Start backend API
```bash
cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Start Expo web app (new terminal)
```bash
cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/mobile
npm install --legacy-peer-deps
npm run web
```

### Step 3: Install Selenium dependency (new terminal)
```bash
cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/testing/selenium
python -m pip install -r requirements.txt
```

### Step 4: Run all Selenium tests
```bash
cd /home/runner/work/smart-farming-assistant/smart-farming-assistant/testing/selenium
python run_all.py
```

---

## 4) Optional environment variables
- `SELENIUM_APP_URL` (default: `http://localhost:8081`)
- `SELENIUM_HEADLESS` (`1` headless, `0` headed)
- `SELENIUM_TIMEOUT` (default: `25`)
- `SELENIUM_TEST_PASSWORD` (default: `Pass1234!`)

Example:
```bash
export SELENIUM_APP_URL="http://localhost:8081"
export SELENIUM_HEADLESS="1"
python /home/runner/work/smart-farming-assistant/smart-farming-assistant/testing/selenium/run_all.py
```

---

## 5) Evidence/output files for report
Generated in:
- `/home/runner/work/smart-farming-assistant/smart-farming-assistant/testing/selenium/artifacts`

Outputs:
- Failure screenshots: `*.png`
- Result JSON: `selenium_results_<timestamp>.json`
- Result CSV: `selenium_results_<timestamp>.csv`

Use these files directly in your college submission.
