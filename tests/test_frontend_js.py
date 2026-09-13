"""Run the Node tests for the page script (tests/app_*.test.mjs).

These tests need no npm packages. They are skipped when node is not
installed."""
import shutil
import subprocess
from pathlib import Path

import pytest

TESTS = Path(__file__).parent


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
def test_page_script_node_suite():
    files = sorted(str(p) for p in TESTS.glob("app_*.test.mjs"))
    assert files, "no app_*.test.mjs files found"
    result = subprocess.run(["node", "--test", *files], capture_output=True,
                            text=True, timeout=120)
    assert result.returncode == 0, result.stdout + result.stderr
