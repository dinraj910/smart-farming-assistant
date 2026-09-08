import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from selenium import webdriver
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

APP_URL = os.environ.get("SELENIUM_APP_URL", "http://localhost:8081")
ARTIFACTS_DIR = Path(os.environ.get("SELENIUM_ARTIFACTS_DIR", "testing/selenium/artifacts"))
TIMEOUT = int(os.environ.get("SELENIUM_TIMEOUT", "25"))


@dataclass
class TestContext:
    email: str
    password: str
    name: str
    plot_name: str


def build_test_context() -> TestContext:
    suffix = uuid.uuid4().hex[:8]
    pwd = os.environ.get("SELENIUM_TEST_PASSWORD", "Pass1234!")
    return TestContext(
        f"selenium.user.{suffix}@example.com",
        pwd,
        f"Selenium User {suffix}",
        f"Selenium Plot {suffix}",
    )


def create_driver() -> webdriver.Chrome:
    options = ChromeOptions()
    if os.environ.get("SELENIUM_HEADLESS", "1") == "1":
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,900")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(TIMEOUT)
    return driver


def wait(driver, timeout: int = TIMEOUT):
    return WebDriverWait(driver, timeout)


def by_testid(testid: str):
    return (By.CSS_SELECTOR, f'[data-testid="{testid}"]')


def by_testid_prefix(prefix: str):
    return (By.CSS_SELECTOR, f'[data-testid^="{prefix}"]')


def open_app(driver):
    driver.get(APP_URL)


def click_testid(driver, testid: str):
    elem = wait(driver).until(EC.element_to_be_clickable(by_testid(testid)))
    elem.click()


def fill_testid(driver, testid: str, value: str):
    elem = wait(driver).until(EC.presence_of_element_located(by_testid(testid)))
    elem.click()
    elem.send_keys(Keys.CONTROL, "a")
    elem.send_keys(Keys.DELETE)
    elem.send_keys(value)


def click_text(driver, text: str):
    elem = wait(driver).until(
        EC.element_to_be_clickable((By.XPATH, f'//*[normalize-space()="{text}"]'))
    )
    elem.click()


def wait_for_text(driver, text: str, timeout: int = TIMEOUT):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.XPATH, f'//*[contains(normalize-space(),"{text}")]'))
    )


def wait_for_testid(driver, testid: str, timeout: int = TIMEOUT):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located(by_testid(testid)))


def wait_for_testid_prefix(driver, prefix: str, timeout: int = TIMEOUT):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located(by_testid_prefix(prefix)))


def screenshot(driver, name: str):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    path = ARTIFACTS_DIR / f"{name}.png"
    driver.save_screenshot(str(path))
    return str(path)


def clear_browser_state(driver):
    driver.delete_all_cookies()
    driver.execute_script("window.localStorage.clear();")
    driver.execute_script("window.sessionStorage.clear();")


def go_to_login(driver):
    open_app(driver)
    click_testid(driver, "welcome-get-started-btn")
    wait_for_testid(driver, "login-submit-btn")


def go_to_register(driver):
    go_to_login(driver)
    click_testid(driver, "login-go-register-btn")
    wait_for_testid(driver, "register-submit-btn")


def register_user(driver, ctx: TestContext):
    go_to_register(driver)
    fill_testid(driver, "register-name-input", ctx.name)
    fill_testid(driver, "register-email-input", ctx.email)
    fill_testid(driver, "register-password-input", ctx.password)
    fill_testid(driver, "register-confirm-password-input", ctx.password)
    click_testid(driver, "register-submit-btn")
    wait_for_testid(driver, "tab-home")


def logout(driver):
    click_testid(driver, "tab-farms")
    wait_for_testid(driver, "farms-registered-plots-title")
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    click_testid(driver, "farms-signout-btn")
    wait_for_testid(driver, "welcome-get-started-btn")


def login_user(driver, ctx: TestContext):
    go_to_login(driver)
    fill_testid(driver, "login-email-input", ctx.email)
    fill_testid(driver, "login-password-input", ctx.password)
    click_testid(driver, "login-submit-btn")
    wait_for_testid(driver, "tab-home")


def safe_run(name, test_fn, driver, ctx):
    started = time.time()
    try:
        test_fn(driver, ctx)
        return {
            "id": name,
            "status": "PASS",
            "duration_s": round(time.time() - started, 2),
            "error": "",
            "screenshot": "",
        }
    except Exception as exc:
        shot = screenshot(driver, f"{name}_failed")
        return {
            "id": name,
            "status": "FAIL",
            "duration_s": round(time.time() - started, 2),
            "error": str(exc),
            "screenshot": shot,
        }


def wait_for_alert_and_accept(driver, timeout: int = 8):
    WebDriverWait(driver, timeout).until(EC.alert_is_present())
    alert = driver.switch_to.alert
    text = alert.text
    alert.accept()
    return text
