import csv
import importlib
import json
import sys
from datetime import datetime
from pathlib import Path

from selenium_helpers import ARTIFACTS_DIR, build_test_context, create_driver, safe_run

TEST_MODULES = [
    "tests.tc01_register_success",
    "tests.tc02_register_password_mismatch",
    "tests.tc03_login_wrong_password",
    "tests.tc04_login_success",
    "tests.tc05_farms_list_load",
    "tests.tc06_add_plot_validation",
    "tests.tc07_add_plot_success",
    "tests.tc08_open_plot_detail",
    "tests.tc09_agent_chat_send_flow",
    "tests.tc10_sign_out",
]


def run_once(driver, ctx):
    results = []
    for module_name in TEST_MODULES:
        mod = importlib.import_module(module_name)
        result = safe_run(mod.ID, mod.run, driver, ctx)
        result["name"] = mod.NAME
        results.append(result)
    return results


def write_reports(results, retry_results):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    json_path = ARTIFACTS_DIR / f"selenium_results_{timestamp}.json"
    csv_path = ARTIFACTS_DIR / f"selenium_results_{timestamp}.csv"

    output = {
        "timestamp_utc": timestamp,
        "results": results,
        "retry_results": retry_results,
    }
    json_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["id", "name", "status", "duration_s", "error", "screenshot"],
        )
        writer.writeheader()
        for row in results:
            writer.writerow({k: row.get(k, "") for k in writer.fieldnames})

    return str(json_path), str(csv_path)


def main():
    driver = create_driver()
    ctx = build_test_context()
    try:
        results = run_once(driver, ctx)

        # Rerun failed tests once to detect flaky failures
        retry_results = {}
        for module_name in TEST_MODULES:
            mod = importlib.import_module(module_name)
            failed = next((r for r in results if r["id"] == mod.ID and r["status"] == "FAIL"), None)
            if failed:
                retry_results[mod.ID] = safe_run(mod.ID + "_RETRY", mod.run, driver, ctx)

        json_report, csv_report = write_reports(results, retry_results)

        passed = sum(1 for r in results if r["status"] == "PASS")
        failed = sum(1 for r in results if r["status"] == "FAIL")

        print(f"Total: {len(results)} | Passed: {passed} | Failed: {failed}")
        print(f"JSON report: {json_report}")
        print(f"CSV report: {csv_report}")

        if failed > 0:
            sys.exit(1)
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
