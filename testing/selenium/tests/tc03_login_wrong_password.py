from selenium_helpers import clear_browser_state, go_to_login, fill_testid, click_testid, wait_for_testid

ID = "TC3"
NAME = "Login wrong password"


def run(driver, ctx):
    clear_browser_state(driver)
    go_to_login(driver)
    fill_testid(driver, "login-email-input", ctx.email)
    fill_testid(driver, "login-password-input", f"{ctx.password}wrong")
    click_testid(driver, "login-submit-btn")
    wait_for_testid(driver, "login-error-box")
