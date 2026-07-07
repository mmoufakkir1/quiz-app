#!/usr/bin/env python3
import importlib.util
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SYNC_SCRIPT = REPO_ROOT / "scripts" / "sync-flashcards-from-pdf.py"

spec = importlib.util.spec_from_file_location("sync_pdf", SYNC_SCRIPT)
sync_pdf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync_pdf)

practices_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else sync_pdf.DEFAULT_PRACTICES_DIR
explanations = sync_pdf.load_pdf_explanations(practices_dir)
print(json.dumps(explanations, ensure_ascii=False))
