"""
NatureSync — Selenium Chrome Driver Setup & Automation Utilities
Provides cross-platform WebDriver initialization, screenshot capture, and resilient element helpers.
"""

import os
import sys
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Base Directories
TESTING_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = TESTING_DIR / "reports"
SCREENSHOTS_DIR = REPORTS_DIR / "screenshots"

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)


def get_chrome_options(headless: bool = False) -> Options:
    """Configures Chrome options optimized for stable local automated testing."""
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    
    options.add_argument("--start-maximized")
    options.add_argument("--window-size=1440,900")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--disable-blink-features=AutomationControlled")
    
    # Clean UI experience for reviewer observation
    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    options.add_experimental_option("useAutomationExtension", False)
    return options


def get_driver(headless: bool = False) -> webdriver.Chrome:
    """
    Initializes a Chrome WebDriver instance.
    Attempts automatic driver resolution via webdriver-manager first,
    falling back to Selenium 4's built-in Selenium Manager if needed.
    """
    options = get_chrome_options(headless=headless)
    
    # Try webdriver_manager first
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(5)
        return driver
    except Exception as e:
        # Fallback to default selenium 4 resolution
        try:
            driver = webdriver.Chrome(options=options)
            driver.set_page_load_timeout(30)
            driver.implicitly_wait(5)
            return driver
        except Exception as e2:
            raise RuntimeError(
                f"Failed to initialize Google Chrome WebDriver.\n"
                f"1. Please ensure Google Chrome is installed on your system.\n"
                f"2. Ensure you have run: pip install -r requirements.txt\n"
                f"Detailed error: {e2}"
            )


def capture_screenshot(driver: webdriver.Chrome, test_id: str, label: str = "") -> Path:
    """
    Takes a high-resolution screenshot of the current browser state
    and saves it to testing/reports/screenshots/ for inclusion in test reports.
    """
    safe_label = label.replace(" ", "_").replace("/", "_").replace(":", "")[:30]
    filename = f"{test_id}_{safe_label}.png" if safe_label else f"{test_id}.png"
    filepath = SCREENSHOTS_DIR / filename
    
    try:
        # Allow animations to settle
        time.sleep(0.5)
        driver.save_screenshot(str(filepath))
        return filepath
    except Exception as e:
        print(f"Warning: Could not capture screenshot {filename}: {e}")
        return filepath


def wait_and_click(driver: webdriver.Chrome, by: By, value: str, timeout: int = 10):
    """Waits for an element to become clickable, then clicks it safely."""
    wait = WebDriverWait(driver, timeout)
    element = wait.until(EC.element_to_be_clickable((by, value)))
    driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", element)
    time.sleep(0.3)
    element.click()
    return element


def wait_for_visible(driver: webdriver.Chrome, by: By, value: str, timeout: int = 10):
    """Waits for an element to become visible on the DOM."""
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.visibility_of_element_located((by, value)))
