from selenium_helpers import (
    clear_browser_state,
    go_to_register,
    fill_testid,
    click_testid,
    wait_for_text,
)

ID = "TC2"
NAME = "Register password mismatch"


def run(driver, ctx):
    clear_browser_state(driver)
    go_to_register(driver)
    fill_testid(driver, "register-name-input", f"{ctx.name} mismatch")
    fill_testid(driver, "register-email-input", f"mismatch.{ctx.email}")
    fill_testid(driver, "register-password-input", ctx.password)
    fill_testid(driver, "register-confirm-password-input", f"{ctx.password}x")
    click_testid(driver, "register-submit-btn")
    wait_for_text(driver, "Passwords do not match")
