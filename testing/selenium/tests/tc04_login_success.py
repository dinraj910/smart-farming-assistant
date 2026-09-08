from selenium_helpers import clear_browser_state, login_user, wait_for_testid

ID = "TC4"
NAME = "Login valid user"


def run(driver, ctx):
    clear_browser_state(driver)
    login_user(driver, ctx)
    wait_for_testid(driver, "tab-home")
    wait_for_testid(driver, "tab-farms")
