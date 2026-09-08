from selenium_helpers import clear_browser_state, login_user, click_testid, wait_for_testid

ID = "TC5"
NAME = "Farms list loads"


def run(driver, ctx):
    clear_browser_state(driver)
    login_user(driver, ctx)
    click_testid(driver, "tab-farms")
    wait_for_testid(driver, "farms-registered-plots-title")
