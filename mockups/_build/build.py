#!/usr/bin/env python3
"""Regenerate every screen mockup and the index.

    cd mockups/_build && python3 build.py
"""

import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

SECTIONS = [
    "s0_home",
    "s1_auth",
    "s2_friends",
    "s3_groups",
    "s4_expense",
    "s5_settlements",
    "s6_activity",
    "s7_personal",
    "s8_account",
]


def main():
    import lib
    for name in SECTIONS:
        try:
            mod = importlib.import_module(name)
        except ModuleNotFoundError:
            print(f"  skip {name} (not written yet)")
            continue
        mod.build()
    import index
    index.build(lib.written())
    print(f"\n{len(lib.written())} screen files + 00-index.html")
    for slug, num, title, sid, _ in lib.written():
        print(f"  {num}  {slug:38} {sid}")


if __name__ == "__main__":
    main()
