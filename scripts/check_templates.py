#!/usr/bin/env python3
"""校验生成结果：模板 token 必须全部被替换，且运行时占位符必须保留。

模板化之后存在一类新的静默故障：templates/*.tpl 里写了 {{TOKEN}}，
但 generate.py 没有提供取值，或渲染后残留 {{...}} 进入线上页面。

检查项：
  1. Custom.xaml / panel.xaml 中不得残留 {{...}}
  2. 模板里出现的每个 token，generate.py 都必须提供取值
  3. 运行时占位符 __XXX__ 必须与模板一致（不能被生成过程吃掉）

用法：python scripts/check_templates.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TLP = ROOT / "templates"
GEN = ROOT / "scripts" / "generate.py"

TOKEN_RE = re.compile(r"\{\{([A-Z][A-Z0-9_]*)(?:\|[a-z]+)?\}\}")
RUNTIME_RE = re.compile(r"__[A-Z][A-Z0-9_]*__")

# 由 build_* 在运行时注入（不在 render_template 的 values 字典里出现）
INJECTED = {"NAME", "ADDRESS", "COPY_LOGO", "VERSION", "INFO_TEXT", "POPUP_DATA"}


def main() -> int:
    problems = []

    if not TLP.is_dir():
        print("[FAIL] 找不到 templates/ 目录")
        return 1

    tpl_files = sorted(TLP.glob("*.tpl"))
    if not tpl_files:
        print("[FAIL] templates/ 下没有 .tpl 文件")
        return 1

    gen_text = GEN.read_text(encoding="utf-8")
    provided = set(re.findall(r'"([A-Z][A-Z0-9_]*)":', gen_text))

    # 1 + 2：模板 token 必须有取值
    for tpl in tpl_files:
        tokens = set(TOKEN_RE.findall(tpl.read_text(encoding="utf-8")))
        missing = sorted(tokens - provided - INJECTED)
        if missing:
            problems.append(f"templates/{tpl.name}: generator 未提供取值 {missing}")

    # 3：生成物不得残留 {{...}}
    for name in ("Custom.xaml", "panel.xaml"):
        p = ROOT / name
        if not p.exists():
            problems.append(f"缺少生成物 {name}")
            continue
        text = p.read_text(encoding="utf-8")
        leftover = sorted(set(TOKEN_RE.findall(text)))
        if leftover:
            problems.append(f"{name}: 残留未替换的模板 token {leftover}")

    # 4：运行时占位符必须与模板一致
    for name, tpl_name in (("Custom.xaml", "Custom.xaml.tpl"),
                           ("panel.xaml", "panel.xaml.tpl")):
        p, t = ROOT / name, TLP / tpl_name
        if not (p.exists() and t.exists()):
            continue
        out_ph = set(RUNTIME_RE.findall(p.read_text(encoding="utf-8")))
        tpl_ph = set(RUNTIME_RE.findall(t.read_text(encoding="utf-8")))
        if out_ph != tpl_ph:
            problems.append(
                f"{name}: 运行时占位符与模板不一致，"
                f"丢失 {sorted(tpl_ph - out_ph)}，新增 {sorted(out_ph - tpl_ph)}"
            )

    if problems:
        print("[FAIL] 模板一致性校验未通过：")
        for p in problems:
            print("  - " + p)
        return 1

    total = sum(len(set(TOKEN_RE.findall(t.read_text(encoding="utf-8")))) for t in tpl_files)
    print(f"[OK] 模板一致：{len(tpl_files)} 个模板 / {total} 个生成期 token，生成物无残留")
    return 0


if __name__ == "__main__":
    sys.exit(main())
