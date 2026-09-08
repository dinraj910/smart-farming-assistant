from selenium_helpers import (
    clear_browser_state,
    login_user,
    click_testid,
    fill_testid,
    wait_for_text,
    wait_for_testid,
)

ID = "TC8"
NAME = "Open plot details"


def run(driver, ctx):
    clear_browser_state(driver)
    login_user(driver, ctx)
    click_testid(driver, "tab-farms")
    click_testid(driver, "farms-add-plot-btn")
    fill_testid(driver, "farms-plot-name-input", ctx.plot_name)
    fill_testid(driver, "farms-plot-acres-input", "2.0")
    click_testid(driver, "farms-save-plot-btn")
    plot_text = wait_for_text(driver, ctx.plot_name)
    plot_text.click()
    wait_for_testid(driver, "field-detail-title")
