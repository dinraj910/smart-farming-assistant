from selenium_helpers import (
    clear_browser_state,
    login_user,
    click_testid,
    fill_testid,
    wait_for_text,
    wait_for_testid,
    wait_for_testid_prefix,
    wait,
)

ID = "TC9"
NAME = "Agent chat send flow"


def run(driver, ctx):
    clear_browser_state(driver)
    login_user(driver, ctx)

    # Ensure at least one farm exists
    click_testid(driver, "tab-farms")
    click_testid(driver, "farms-add-plot-btn")
    fill_testid(driver, "farms-plot-name-input", ctx.plot_name)
    fill_testid(driver, "farms-plot-acres-input", "1.2")
    click_testid(driver, "farms-save-plot-btn")
    wait_for_text(driver, ctx.plot_name)

    # Open assistant flow and select field
    click_testid(driver, "tab-assistant")
    wait_for_testid(driver, "agent-select-title")
    wait_for_text(driver, ctx.plot_name).click()

    # Send message
    wait_for_testid(driver, "agent-chat-input")
    question = "Any rain risk this week?"
    fill_testid(driver, "agent-chat-input", question)
    click_testid(driver, "agent-chat-send-btn")

    # Validate user message and assistant response bubbles are visible
    wait_for_testid_prefix(driver, "agent-chat-user-msg-")

    wait(driver, timeout=120).until(
        lambda d: len(d.find_elements(*("css selector", '[data-testid^="agent-chat-assistant-msg-"]'))) >= 2
    )
