"""校验 functions/ 下的 ES 模块引用图：import 的符号必须在目标模块中真实导出。

不依赖 Node 运行时，纯静态解析，可用于 CI 离线检查。
"""
import pathlib
import re
import sys

# 本脚本位于 scripts/ 下，仓库根目录在其上一层
ROOT = pathlib.Path(__file__).resolve().parent.parent
FUNCS = ROOT / "functions"

IMPORT_RE = re.compile(r"import\s*\{(?P<names>[^}]*)\}\s*from\s*[\"'](?P<path>[^\"']+)[\"']")
EXPORT_RE = re.compile(r"export\s*\{(?P<names>[^}]*)\}\s*;?")
# export async function foo / export function foo / export { a, b }
EXPORT_DECL_RE = re.compile(r"export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)")


def split_names(raw: str):
    out = []
    for part in raw.replace("\n", " ").split(","):
        part = part.strip()
        if not part:
            continue
        # 处理 "a as b" 形式
        if " as " in part:
            part = part.split(" as ")[-1].strip()
        out.append(part)
    return out


def exported_names(path: pathlib.Path):
    text = path.read_text(encoding="utf-8")
    names = set(EXPORT_DECL_RE.findall(text))
    for m in EXPORT_RE.finditer(text):
        names |= set(split_names(m.group("names")))
    return names


def main() -> int:
    problems = []
    checked = 0

    for path in sorted(FUNCS.rglob("*.js")):
        text = path.read_text(encoding="utf-8")
        for m in IMPORT_RE.finditer(text):
            rel = m.group("path")
            target = (path.parent / rel).resolve()
            if not target.exists():
                problems.append(f"{path.relative_to(ROOT)}: 无法解析的导入路径 {rel}")
                continue
            wanted = split_names(m.group("names"))
            have = exported_names(target)
            missing = [n for n in wanted if n not in have]
            checked += 1
            if missing:
                problems.append(
                    f"{path.relative_to(ROOT)}: 从 {rel} 导入了未导出的符号 {missing}"
                )

    if problems:
        print("[FAIL] 模块引用校验未通过：")
        for p in problems:
            print("  - " + p)
        return 1

    print(f"[OK] 模块引用校验通过（检查了 {checked} 条 import）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
