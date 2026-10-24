#!/usr/bin/env python3
"""Sync extension/ -> docs/ and demo/, or verify with --check.

extension/ is the only source of truth.
docs/index.html = extension/index.html + localStorage shim + selftest.js
"""
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXT, DOCS, DEMO = ROOT / "extension", ROOT / "docs", ROOT / "demo"

SHIM = """<script>
try{localStorage.getItem('__probe');}catch(e){
  var __m={};var __ls={getItem:function(k){return k in __m?__m[k]:null},setItem:function(k,v){__m[k]=String(v)},removeItem:function(k){delete __m[k]},clear:function(){__m={}}};
  try{Object.defineProperty(window,'localStorage',{value:__ls,configurable:true})}catch(_){}
}
</script>"""

COPIES = [("script.js", DOCS), ("style.css", DOCS),
          ("index.html", DEMO), ("script.js", DEMO), ("style.css", DEMO)]


def docs_index() -> str:
    html = (EXT / "index.html").read_text(encoding="utf-8")
    html = html.replace("<title>Nix</title>", "<title>Nix 自测页</title>", 1)
    tag = '<script src="script.js"></script>'
    if html.count(tag) != 1:
        raise SystemExit("extension/index.html: expected exactly one script.js tag")
    inject = SHIM + "\n" + tag + '\n<script src="selftest.js"></script>'
    return html.replace(tag, inject, 1)


def problems():
    out = []
    for name, d in COPIES:
        if (EXT / name).read_bytes() != (d / name).read_bytes():
            out.append(str((d / name).relative_to(ROOT)))
    if docs_index() != (DOCS / "index.html").read_text(encoding="utf-8"):
        out.append("docs/index.html")
    return out


def main() -> int:
    if "--check" in sys.argv:
        bad = problems()
        if bad:
            print("out of sync:")
            for p in bad:
                print("  " + p)
            print("run: python3 tools/sync.py")
            return 1
        print("ok: generated files match extension/")
        return 0
    for name, d in COPIES:
        (d / name).write_bytes((EXT / name).read_bytes())
    (DOCS / "index.html").write_text(docs_index(), encoding="utf-8")
    print("synced docs/ and demo/ from extension/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
