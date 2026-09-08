# Selenium Testing Report — Smart Farming Assistant

## 1. Objective
Validate core user-facing workflows of the Expo Web build using Selenium UI automation.

## 2. Tools Used
- Selenium WebDriver
- Browser: Chrome (version: ____)
- Python version: ____
- OS: ____

## 3. Test Environment
- Repository: `dinraj910/smart-farming-assistant`
- Backend URL: `http://localhost:8000`
- App URL: `http://localhost:8081` (or your configured Expo web URL)
- Date/Time of execution: ____

## 4. Test Cases and Results
| ID | Scenario | Expected Result | Actual Result | Status (Pass/Fail) | Evidence |
|---|---|---|---|---|---|
| TC1 | Register with valid fields | Account created and main tabs visible |  |  |  |
| TC2 | Register with password mismatch | “Passwords do not match” shown |  |  |  |
| TC3 | Login with wrong password | Error shown |  |  |  |
| TC4 | Login with valid credentials | Main tabs visible |  |  |  |
| TC5 | Farms page load | “Registered Plots” section visible |  |  |  |
| TC6 | Add Plot without name | Validation alert shown |  |  |  |
| TC7 | Add Plot valid data | New plot appears in list |  |  |  |
| TC8 | Open plot details | Plot detail page opens |  |  |  |
| TC9 | Agent chat send flow | User and assistant messages visible |  |  |  |
| TC10 | Sign out | Returned to welcome/get started screen |  |  |  |

## 5. Defects Found
- Defect 1:
  - Description:
  - Steps to reproduce:
  - Severity:
  - Screenshot:

## 6. Summary Metrics
- Total test cases: 10
- Passed: ____
- Failed: ____
- Pass percentage: ____

## 7. Conclusion
Provide final remarks on system stability and readiness.

## 8. Next Improvements
- Add Firefox cross-browser run
- Add CI integration for Selenium regression suite
- Increase coverage for weather, market, and doctor screens
