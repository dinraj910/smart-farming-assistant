from selenium_helpers import clear_browser_state, open_app, register_user, wait_for_testid

ID = "TC1"
NAME = "Register valid user"


def run(driver, ctx):
    clear_browser_state(driver)
    open_app(driver)
    register_user(driver, ctx)
    wait_for_testid(driver, "tab-home")
