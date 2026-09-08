from selenium_helpers import (
    clear_browser_state,
    login_user,
    click_testid,
    wait_for_alert_and_accept,
)

ID = "TC6"
NAME = "Add plot validation without name"


def run(driver, ctx):
    clear_browser_state(driver)
    login_user(driver, ctx)
    click_testid(driver, "tab-farms")
    click_testid(driver, "farms-add-plot-btn")
    click_testid(driver, "farms-save-plot-btn")
    alert_text = wait_for_alert_and_accept(driver)
    if "Please enter a plot name" not in alert_text:
        raise AssertionError(f"Expected validation alert, got: {alert_text}")
