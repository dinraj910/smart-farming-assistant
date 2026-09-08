from selenium_helpers import (
    clear_browser_state,
    login_user,
    click_testid,
    fill_testid,
    wait_for_text,
)

ID = "TC7"
NAME = "Add plot success"


def run(driver, ctx):
    clear_browser_state(driver)
    login_user(driver, ctx)
    click_testid(driver, "tab-farms")
    click_testid(driver, "farms-add-plot-btn")
    fill_testid(driver, "farms-plot-name-input", ctx.plot_name)
    fill_testid(driver, "farms-plot-acres-input", "1.5")
    click_testid(driver, "farms-save-plot-btn")
    wait_for_text(driver, ctx.plot_name)
