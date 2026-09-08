from selenium_helpers import clear_browser_state, login_user, logout, wait_for_testid

ID = "TC10"
NAME = "Sign out flow"


def run(driver, ctx):
    clear_browser_state(driver)
    login_user(driver, ctx)
    logout(driver)
    wait_for_testid(driver, "welcome-get-started-btn")
