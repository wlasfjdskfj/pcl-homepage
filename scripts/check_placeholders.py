#!/usr/bin/env python3
"""校验主页模板 / 中间件 / 生成器三方的占位符一致性。

背景：Custom.xaml、panel.xaml 由 scripts/generate.py 生成，再由
functions/_middleware.js 在运行时替换 __XXX__ 占位符。三方任一不同步都会
造成静默故障，例如历史上 __DATE_YEAR__ 同时出现在生成器与中间件里，
却从未出现在任何模板中（死占位符）。

判定规则（单个模板文件 X 与对应中间件替换集合 M 的关系）：
  1. X 中的占位符必须全部被中间件处理，否则用户会直接看到 __XXX__ 原文。
  2. M 必须是「X ∪ panel.xaml」的子集，否则是死占位符。
     注意中间件为两个页面共用同一段替换代码，因此按两文件并集判定，
     再对每个文件单独做「多余项」提示（仅提示，不算失败）。
  3. generate.py 中出现的占位符也必须能被中间件处理。

用法：python scripts/check_placeholders.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 占位符本体：__UPPER_SNAKE__
PLACEHOLDER = re.compile(r"(__[A-Z][A-Z0-9_]*__)")

# 中间件替换形如：
#   .replace(/__X__/g, ...)
#   .replace(/<!--\s*__X__\s*-->|__X__/g, ...)
# 取每个 .replace(...) 调用里出现的所有占位符
MW_REPLACE = re.compile(
    r"\.replace\(\s*/(?P<pat>.+?)/g\s*,", re.DOTALL
)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def placeholders_in(text: str) -> set:
    return set(PLACEHOLDER.findall(text))


def middleware_replaced(text: str) -> set:
    """收集中间件里被 .replace(/.../g, ...) 处理的全部占位符。"""
    found = set()
    for m in MW_REPLACE.finditer(text):
        found |= placeholders_in(m.group("pat"))
    return found


def main() -> int:
    custom = ROOT / "Custom.xaml"
    panel = ROOT / "panel.xaml"
    mw_path = ROOT / "functions" / "_middleware.js"
    gen_path = ROOT / "scripts" / "generate.py"

    for p in (custom, panel, mw_path, gen_path):
        if not p.exists():
            print("[FAIL] 缺少文件：" + str(p))
            return 1

    custom_ph = placeholders_in(read(custom))
    panel_ph = placeholders_in(read(panel))
    mw_ph = middleware_replaced(read(mw_path))
    gen_ph = placeholders_in(read(gen_path))
    templates_union = custom_ph | panel_ph

    problems = []

    # 规则 1：模板里出现的，中间件必须能替换
    for name, ph in (("Custom.xaml", custom_ph), ("panel.xaml", panel_ph)):
        unhandled = sorted(ph - mw_ph)
        if unhandled:
            problems.append(
                f"{name}: 模板中用到但中间件不会替换（用户会看到原始 __XXX__）：{unhandled}"
            )

    # 规则 2：中间件替换的，必须至少存在于某一个模板中（死占位符检测）
    dead = sorted(mw_ph - templates_union)
    if dead:
        problems.append(f"中间件替换了但两个模板都不含有的死占位符：{dead}")

    # 规则 3：生成器里出现的，中间件必须能替换
    orphan = sorted(gen_ph - mw_ph)
    if orphan:
        problems.append(f"generate.py 中出现但中间件不处理的占位符：{orphan}")

    if problems:
        print("[FAIL] 占位符一致性校验未通过：")
        for p in problems:
            print("  - " + p)
        return 1

    print(
        "[OK] 占位符一致：Custom.xaml {0} 个 / panel.xaml {1} 个 / "
        "中间件处理 {2} 个 / generate.py {3} 个".format(
            len(custom_ph), len(panel_ph), len(mw_ph), len(gen_ph)
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
