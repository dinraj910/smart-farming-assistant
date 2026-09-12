"""
Build script for Render deployment:
1. Fetches prisma query engine binaries.
2. Locates and copies the query engine directly into the project directory
   with both 'query-engine-*' and 'prisma-query-engine-*' names.
3. Sets executable permissions (chmod +x).
4. Runs prisma generate.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path


def main():
    print("--- [Build Step] Fetching Prisma binaries ---")
    subprocess.run([sys.executable, "-m", "prisma", "py", "fetch"], check=True)

    from prisma._config import config
    from prisma.engine import utils

    cache_dir = Path(config.binary_cache_dir)
    expected_name = utils.query_engine_name()
    backend_dir = Path(__file__).resolve().parent

    search_dirs = [
        cache_dir,
        cache_dir / "node_modules" / "prisma",
        backend_dir,
    ]

    found_binary = None
    for d in search_dirs:
        if not d.exists():
            continue
        for f in d.iterdir():
            if "query-engine" in f.name and not f.is_dir():
                found_binary = f
                break
        if found_binary:
            break

    if found_binary:
        print(f"Found engine binary: {found_binary}")
        targets = [
            backend_dir / expected_name,
            backend_dir / found_binary.name,
        ]
        for target in targets:
            if target != found_binary:
                shutil.copy2(found_binary, target)
                print(f"Copied binary to: {target}")
            try:
                os.chmod(target, 0o755)
            except Exception:
                pass

    print("--- [Build Step] Generating Prisma client ---")
    subprocess.run([sys.executable, "-m", "prisma", "generate"], check=True)
    print("--- [Build Step] Complete! ---")


if __name__ == "__main__":
    main()
