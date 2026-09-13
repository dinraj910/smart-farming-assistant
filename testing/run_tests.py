"""
================================================================================
NatureSync — Master Selenium Test Suite Runner & Report Compiler
================================================================================
Usage:
    python run_tests.py              (Runs with visible Google Chrome window)
    python run_tests.py --headless   (Runs silently in background)

Outputs:
    - testing/reports/NatureSync_Selenium_Test_Report.html (Official Evaluation Report)
    - testing/reports/TEST_EXECUTION_REPORT.md             (Scrum Documentation Summary)
    - testing/reports/screenshots/*.png                   (Visual Evidence Proofs)
"""

import os
import sys
import time
import argparse
import webbrowser
from pathlib import Path

# Add testing directory and parent to Python search path
CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from utils.driver_setup import get_driver
from utils.report_generator import generate_reports

# Import Test Case Modules
from test_cases import (
    test_01_backend_health,
    test_02_swagger_docs,
    test_03_crop_recommendation,
    test_04_leaf_doctor,
    test_05_market_intelligence,
    test_06_farm_ai_advisor,
    test_07_web_portal_e2e
)


def print_banner():
    banner = r"""
================================================================================
    _   __      __                  _____                   
   / | / /___ _/ /___  __________  / ___/__  ______  _____
  /  |/ / __ `/ __/ / / / ___/ _ \ \__ \/ / / / __ \/ ___/
 / /|  / /_/ / /_/ /_/ / /  /  __/ ___/ / /_/ / / / / /__  
/_/ |_/\__,_/\__/\__,_/_/   \___/ /____/\__, /_/ /_/\___/   
                                       /____/               
        Selenium Automated Testing & Scrum Verification Suite
================================================================================
"""
    print(banner)


def main():
    parser = argparse.ArgumentParser(description="NatureSync Selenium Automated Test Suite")
    parser.add_argument("--headless", action="store_true", help="Run Chrome in headless (background) mode")
    parser.add_argument("--no-open", action="store_true", help="Do not automatically open the HTML report after execution")
    args = parser.parse_args()

    print_banner()
    print(f"[*] Execution Mode: {'Headless (Background)' if args.headless else 'Interactive GUI (Visible Chrome Browser)'}")
    print(f"[*] Target Environment: Local Offline Isolated Environment")
    print(f"[*] Starting Chrome WebDriver...\n")

    overall_start = time.time()
    results = []
    driver = None

    try:
        driver = get_driver(headless=args.headless)
        print("[+] Chrome WebDriver initialized successfully.\n")

        # ----------------------------------------------------------------------
        # Execute Test Cases
        # ----------------------------------------------------------------------
        tests = [
            ("TC-01", "Backend Health & API Gateway", lambda: test_01_backend_health.run_test(driver)),
            ("TC-02", "FastAPI Swagger UI Automation", lambda: test_02_swagger_docs.run_test(driver)),
            ("TC-03", "ML Crop Recommendation Engine", lambda: test_03_crop_recommendation.run_test(driver)),
            ("TC-04", "LeafDoctor Vision AI Disease Detection", lambda: test_04_leaf_doctor.run_test(driver)),
            ("TC-05", "Kerala Mandi Market Intelligence", lambda: test_05_market_intelligence.run_test(driver)),
            ("TC-06", "Agentic AI Conversational Farm Advisor", lambda: test_06_farm_ai_advisor.run_test(driver)),
            ("TC-07", "End-to-End Farmer Web Portal UI", lambda: test_07_web_portal_e2e.run_test(driver)),
        ]

        print("-" * 80)
        print(f"{'ID':<7} | {'Test Case Name':<40} | {'Status':<8} | {'Time':<6}")
        print("-" * 80)

        for test_id, name, test_fn in tests:
            try:
                res = test_fn()
                results.append(res)
                status_str = f"[PASS]" if res.get("status") == "PASS" else "[FAIL]"
                print(f"{test_id:<7} | {name:<40} | {status_str:<8} | {res.get('duration', 0):.2f}s")
            except Exception as e:
                err_res = {
                    "id": test_id,
                    "name": name,
                    "module": "System",
                    "objective": "Execute automated test without unhandled exception",
                    "inputs": "Standard",
                    "expected": "Normal execution",
                    "actual": f"Unhandled Exception: {str(e)}",
                    "status": "FAIL",
                    "duration": 0.0,
                    "screenshot": None
                }
                results.append(err_res)
                print(f"{test_id:<7} | {name:<40} | [FAIL]   | 0.00s")

        print("-" * 80)

    except Exception as e:
        print(f"\n[!] Critical Error during test execution: {e}")
    finally:
        if driver:
            print("\n[*] Closing Chrome WebDriver...")
            driver.quit()

    total_duration = time.time() - overall_start
    total = len(results)
    passed = sum(1 for r in results if r.get("status") == "PASS")
    failed = total - passed

    print("\n" + "=" * 80)
    print(f"TEST EXECUTION SUMMARY: {passed}/{total} Passed ({(passed/total*100) if total else 0:.1f}%) | Time: {total_duration:.2f}s")
    print("=" * 80)

    # Generate Reports
    html_path, md_path = generate_reports(results, total_duration)
    print(f"\n[+] HTML Evaluation Report generated at:\n    file:///{html_path.resolve().as_posix()}")
    print(f"[+] Markdown Summary generated at:\n    file:///{md_path.resolve().as_posix()}")

    if not args.no_open and html_path.exists():
        print("\n[*] Launching HTML Test Report in your default browser...")
        try:
            webbrowser.open(html_path.resolve().as_uri())
        except Exception:
            pass

    print("\n[✔] Done! You can now print the HTML report for your Scrum Book sign-off.\n")


if __name__ == "__main__":
    main()
