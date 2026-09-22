#!/usr/bin/env python3
"""主页体检脚本：先查本地仓库一致性，再探测线上接口是否正常。

用法：
    python scripts/doctor.py              # 本地检查 + 线上探测
    python scripts/doctor.py --offline    # 只做本地检查（不联网）

退出码：全部通过为 0，有任一失败为 1。
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.mkejga.de5.net"
PCL_UA = "PCL2/2.13.0"

ok_count = 0
fail_count = 0
warn_count = 0


def ok(msg):
    global ok_count
    ok_count += 1
    print("  [OK]   " + msg)


def fail(msg):
    global fail_count
    fail_count += 1
    print("  [FAIL] " + msg)


def warn(msg):
    global warn_count
    warn_count += 1
    print("  [WARN] " + msg)


def run(cmd):
    """执行子进程，返回 (returncode, stdout+stderr)。"""
    p = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


# ---------------- 本地检查 ----------------

def check_files():
    print("\n[1/5] 关键文件存在性")
    required = [
        "Custom.xaml", "panel.xaml", "panel.json", "_headers",
        "requirements.txt", ".gitignore",
        "templates/Custom.xaml.tpl", "templates/panel.xaml.tpl",
        "templates/server_item.tpl",
        "scripts/generate.py", "scripts/check_placeholders.py",
        "scripts/check_templates.py", "scripts/check_imports.py",
        "functions/_middleware.js", "functions/admin.js",
        "functions/_lib/content.js", "functions/_lib/xaml.js",
        "functions/_lib/weather.js", "functions/_lib/quizimage.js",
        "functions/_lib/admin-util.js", "functions/_lib/admin-theme.js",
        "functions/_lib/admin-api.js",
    ]
    for rel in required:
        if (ROOT / rel).exists():
            ok(rel)
        else:
            fail("缺少文件：" + rel)


def check_json():
    print("\n[2/5] JSON 文件可解析")
    for rel in ("panel.json", "music/music.json"):
        p = ROOT / rel
        if not p.exists():
            warn("不存在，跳过：" + rel)
            continue
        try:
            json.loads(p.read_text(encoding="utf-8"))
            ok(rel)
        except Exception as e:
            fail(f"{rel} 解析失败：{e}")


def check_placeholders_local():
    print("\n[3/5] 占位符与模块引用一致性")
    for script in ("scripts/check_placeholders.py",
                   "scripts/check_templates.py",
                   "scripts/check_imports.py"):
        code, out = run([sys.executable, script])
        line = out.strip().splitlines()[-1] if out.strip() else "(无输出)"
        if code == 0:
            ok(f"{script} -> {line}")
        else:
            fail(f"{script} 未通过：\n{out.rstrip()}")


def check_js_syntax():
    print("\n[4/5] JS 语法检查（需要 node）")
    node = None
    for cand in ("node", "node.exe"):
        code, _ = run([cand, "--version"])
        if code == 0:
            node = cand
            break
    if not node:
        warn("未找到 node，跳过 JS 语法检查")
        return
    files = sorted(str(p.relative_to(ROOT)) for p in (ROOT / "functions").rglob("*.js"))
    bad = []
    for rel in files:
        code, out = run([node, "--check", rel])
        if code != 0:
            bad.append(rel)
    if bad:
        fail("语法错误：" + ", ".join(bad))
    else:
        ok(f"{len(files)} 个 JS 文件语法正常")


def check_image_refs():
    print("\n[5/5] 模板图片引用是否存在（本地资源）")
    text = ""
    for rel in ("Custom.xaml", "panel.xaml"):
        p = ROOT / rel
        if p.exists():
            text += p.read_text(encoding="utf-8")
    # 注意：pack://application:,,,/images/... 是 PCL 启动器内置资源，不在本仓库。
    # 只校验指向本站的本地相对路径 /images/...。
    text = re.sub(r'pack://[^"\']+', "", text)
    refs = set(re.findall(r'/images/[A-Za-z0-9_./-]+\.(?:jpg|png)', text))
    refs |= set(re.findall(r'"(images/[A-Za-z0-9_./-]+\.(?:jpg|png))"', text))
    missing = []
    for r in sorted(refs):
        rel = r.lstrip("/")
        if not (ROOT / rel).exists():
            missing.append(r)
    if missing:
        fail("模板引用了不存在的本地图片：" + ", ".join(missing))
    else:
        ok(f"本地图片引用均存在（{len(refs)} 个）")


# ---------------- 线上探测 ----------------

def http(url, ua=None, timeout=20):
    """用 curl 请求（Windows 自带 curl，避免 Python SSL 环境差异）。返回 (code, body, ctype)。"""
    cmd = ["curl.exe", "-s", "-m", str(timeout), "-o", "-",
           "-w", "\n__META__%{http_code}|%{content_type}", url]
    if ua:
        cmd[1:1] = ["-A", ua]
    code, out = run(cmd)
    if "__META__" not in out:
        return None, out, None
    body, meta = out.rsplit("\n__META__", 1)
    status, _, ctype = meta.partition("|")
    return status.strip(), body, ctype.strip()


def check_online():
    print("\n[线上] 探测 " + SITE)
    checks = [
        ("主页 /Custom.xaml", SITE + "/Custom.xaml", PCL_UA),
        ("面板 /panel.xaml", SITE + "/panel.xaml", PCL_UA),
        ("版本号 /Custom.xaml.version", SITE + "/Custom.xaml.version", PCL_UA),
        ("元数据 /panel.json", SITE + "/panel.json", "Mozilla/5.0"),
    ]
    for label, url, ua in checks:
        status, body, ctype = http(url, ua)
        if status is None:
            warn(f"{label}：请求失败（{body.strip()[:120]}）")
            continue
        if status != "200":
            fail(f"{label} 返回 HTTP {status}")
            continue
        if label.endswith("version"):
            if body.strip().isdigit():
                ok(f"{label} -> {body.strip()}")
            else:
                fail(f"{label} 未返回时间戳：{body.strip()[:60]}")
            continue
        # XAML/JSON 内容基本校验
        if "Custom.xaml" in label or "panel.xaml" in label:
            if "__" in body and re.search(r"__[A-Z][A-Z0-9_]*__", body):
                leftover = sorted(set(re.findall(r"__[A-Z][A-Z0-9_]*__", body)))[:8]
                fail(f"{label} 仍含未替换占位符：{leftover}")
            elif "<StackPanel" not in body:
                fail(f"{label} 内容异常（未找到 StackPanel）")
            else:
                ok(f"{label} -> {len(body)} 字节，占位符已全部替换")
        else:
            try:
                json.loads(body)
                ok(f"{label} -> JSON 正常")
            except Exception as e:
                fail(f"{label} JSON 解析失败：{e}")


def main():
    offline = "--offline" in sys.argv
    print("=" * 56)
    print("PCL2 个性化主页 · 体检报告")
    print("=" * 56)

    check_files()
    check_json()
    check_placeholders_local()
    check_js_syntax()
    check_image_refs()
    if offline:
        print("\n[线上] 已跳过（--offline）")
    else:
        check_online()

    print("\n" + "=" * 56)
    print(f"通过 {ok_count} 项 / 警告 {warn_count} 项 / 失败 {fail_count} 项")
    print("=" * 56)
    return 1 if fail_count else 0


if __name__ == "__main__":
    sys.exit(main())
