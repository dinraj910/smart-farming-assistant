"""
NatureSync — Pytest Configuration & WebDriver Fixtures
Allows running test cases via standard pytest:
    pytest test_cases/ -v
"""

import sys
from pathlib import Path
import pytest

TESTING_DIR = Path(__file__).resolve().parent
REPO_ROOT = TESTING_DIR.parent

if str(TESTING_DIR) not in sys.path:
    sys.path.insert(0, str(TESTING_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from utils.driver_setup import get_driver


@pytest.fixture(scope="session")
def driver():
    """Initializes a shared Chrome WebDriver session for the test run."""
    _driver = get_driver(headless=True)
    yield _driver
    _driver.quit()
