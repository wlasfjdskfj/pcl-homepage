# -*- coding: utf-8 -*-
"""
PCL 主页诊断工具
一键检查：本地文件、服务器响应、占位符残留、IP 与分数一致性

用法：
    python check.py
"""

import re
import sys
import time
import subprocess
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("缺少 requests 库，请先运行：pip install requests")
    sys.exit(1)

# ============ 配置 ============

BASE_DIR = Path(__file__).resolve().parent
GEN_PY = BASE_DIR / "scripts" / "generate.py"
MIDDLEWARE_JS = BASE_DIR / "functions" / "_middleware.js"
CUSTOM_XAML = BASE_DIR / "Custom.xaml"

SERVER_URL = "https://www.mkejga.de5.net"

PLACEHOLDERS = [
    "__DATE_YEAR__", "__DATE_MONTH__", "__DATE_DAY__", "__DATE_WEEKDAY__",
    "__LUCKY_NUMBER__", "__LUCKY_COLOR_NAME__", "__LUCKY_COLOR_HEX__",
    "__EGG_DATA__", "__QUOTE__",
    "__SCORE__", "__COMMENT__", "__GRADE__", "__SCORE_BAR__",
]

# ============ 工具 ============

OK = "[OK]  "
FAIL = "[FAIL]"
WARN = "[WARN]"
INFO = "[INFO]"


def print_header(title):
    print()
    print("=" * 60)
    print("  " + title)
    print("=" * 60)


def print_result(level, msg):
    print("  " + level + " " + msg)


# ============ Hash 算法（和中间件 djb2 一致） ============

def js_hash_code(s):
    h = 5381
    for ch in s:
        h = ((h << 5) + h) + ord(ch)
        h = h & 0x7fffffff
    return h


def deterministic_index(ip, date, salt, max_val):
    seed = js_hash_code(ip + "|" + date + "|" + salt)
    return seed % max_val


def get_score_info(score):
    if score >= 95: return ("欧皇降世！建议立刻去抽卡。", "SSR")
    if score >= 80: return ("运气极佳，适合下矿挖钻石。", "SR")
    if score >= 60: return ("运气不错，平平淡淡才是真。", "R")
    if score >= 40: return ("一般般，建议扶老奶奶过马路。", "N")
    return ("非酋认证，建议在家种地。", "N--")


# ============ 检查项 ============

def check_file_exists():
    print_header("1. 文件检查")

    files = [
        (GEN_PY, "scripts/generate.py"),
        (MIDDLEWARE_JS, "functions/_middleware.js"),
        (BASE_DIR / ".github" / "workflows" / "generate.yml", ".github/workflows/generate.yml"),
    ]

    all_ok = True
    for path, name in files:
        if path.exists():
            size = path.stat().st_size
            print_result(OK, name + " 存在（" + str(size) + " 字节）")
        else:
            print_result(FAIL, name + " 不存在")
            all_ok = False

    return all_ok


def check_generate_py_syntax():
    print_header("2. generate.py 语法检查")

    if not GEN_PY.exists():
        print_result(FAIL, "文件不存在")
        return False

    try:
        content = GEN_PY.read_text(encoding="utf-8")
    except Exception as e:
        print_result(FAIL, "读取失败：" + str(e))
        return False

    first_line = content.split("\n")[0]
    if "/**" in first_line or "const " in first_line[:50]:
        print_result(FAIL, "文件第一行不是 Python 代码，可能被误粘贴成 JS")
        print("        第一行内容：" + first_line)
        return False

    try:
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", str(GEN_PY)],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            print_result(OK, "语法正确")
            return True
        else:
            print_result(FAIL, "语法错误：")
            print(result.stderr)
            return False
    except Exception as e:
        print_result(FAIL, "编译检查失败：" + str(e))
        return False


def check_middleware_js_syntax():
    print_header("3. _middleware.js 语法检查")

    if not MIDDLEWARE_JS.exists():
        print_result(FAIL, "文件不存在")
        return False

    node_cmd = None
    for cmd in ["node", "nodejs"]:
        try:
            subprocess.run([cmd, "--version"], capture_output=True, timeout=3)
            node_cmd = cmd
            break
        except Exception:
            continue

    if not node_cmd:
        print_result(WARN, "未检测到 Node.js，跳过语法检查")
        return True

    try:
        result = subprocess.run(
            [node_cmd, "--check", str(MIDDLEWARE_JS)],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            print_result(OK, "语法正确")
            return True
        else:
            print_result(FAIL, "语法错误：")
            print(result.stderr)
            return False
    except Exception as e:
        print_result(FAIL, "检查失败：" + str(e))
        return False


def check_middleware_placeholders():
    print_header("4. 中间件替换逻辑检查")

    if not MIDDLEWARE_JS.exists():
        print_result(FAIL, "文件不存在")
        return False

    try:
        content = MIDDLEWARE_JS.read_text(encoding="utf-8")
    except Exception as e:
        print_result(FAIL, "读取失败：" + str(e))
        return False

    missing = []
    for ph in PLACEHOLDERS:
        pattern = r"replace\s*\(\s*/" + re.escape(ph) + r"/g"
        if not re.search(pattern, content):
            missing.append(ph)

    if not missing:
        print_result(OK, "所有占位符都有替换逻辑")
        return True
    else:
        print_result(WARN, "以下占位符在中间件里没有替换逻辑：")
        for ph in missing:
            print("        " + ph)
        print("        （如果这是有意的，可以忽略）")
        return True


def check_ip_and_score():
    print_header("5. IP 检测与人品分数验证")

    print_result(INFO, "正在获取公网 IP...")
    my_ip = None
    ip_services = [
        "https://api.ipify.org",
        "https://ifconfig.me/ip",
        "https://icanhazip.com",
    ]
    for svc in ip_services:
        try:
            resp = requests.get(svc, timeout=8, headers={"User-Agent": "curl/7.0"})
            resp.raise_for_status()
            candidate = resp.text.strip()
            if re.match(r"^[\d\.a-fA-F:]+$", candidate):
                my_ip = candidate
                break
        except Exception:
            continue

    if not my_ip:
        print_result(WARN, "无法获取公网 IP，跳过此检查")
        return True

    print_result(INFO, "你的公网 IP：" + my_ip)
    print_result(INFO, "注意：Cloudflare 看到的可能是不同 IP（如运营商级 NAT）")

    today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    expected_score = deterministic_index(my_ip, today_utc, "score", 100) + 1
    expected_comment, expected_grade = get_score_info(expected_score)

    print()
    print_result(INFO, "按 IP + 日期（UTC " + today_utc + "）本地计算的分数：")
    print("        " + str(expected_score) + " 分 · 评级 " + expected_grade)
    print("        评语：" + expected_comment)

    print()
    print_result(INFO, "正在从服务器拉取实际显示的分数...")
    try:
        url = SERVER_URL + "/Custom.xaml"
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "PCL-Homepage-Check/1.0",
            "Cache-Control": "no-cache",
        })
        resp.raise_for_status()
        xaml = resp.text
    except Exception as e:
        print_result(FAIL, "拉取失败：" + str(e))
        return False

    match = re.search(r'<TextBlock Text="(\d+)" FontSize="52"', xaml)
    if not match:
        print_result(FAIL, "无法从服务器 XAML 里找到人品分数")
        return False

    server_score = int(match.group(1))
    server_comment, server_grade = get_score_info(server_score)

    print_result(INFO, "服务器实际返回的分数：")
    print("        " + str(server_score) + " 分 · 评级 " + server_grade)
    print("        评语：" + server_comment)

    print()
    if expected_score == server_score:
        print_result(OK, "分数一致，IP + 日期 hash 逻辑正常")
        return True
    else:
        print_result(WARN, "分数不一致")
        print("        本地算：" + str(expected_score))
        print("        服务器：" + str(server_score))
        print()
        print("        可能原因：")
        print("        1. Cloudflare 看到的 IP 和你本地不一致（运营商 NAT / 代理）")
        print("        2. Cloudflare 中间件还没更新到最新版")
        print("        3. Cloudflare 有缓存")
        print()
        print("        如果反复刷新，服务器分数始终一样，说明 IP hash 逻辑正常工作，")
        print("        只是 Cloudflare 侧看到的出口 IP 和你本地不同。")
        return True


def check_server_response():
    print_header("6. 服务器响应检查")

    url = SERVER_URL + "/Custom.xaml"
    try:
        resp = requests.get(url, timeout=15, headers={
            "User-Agent": "PCL-Homepage-Check/1.0",
            "Cache-Control": "no-cache",
        })
        resp.raise_for_status()
    except Exception as e:
        print_result(FAIL, "请求失败：" + str(e))
        return False

    xaml = resp.text
    print_result(INFO, "URL：" + url)
    print_result(INFO, "HTTP 状态：" + str(resp.status_code))
    print_result(INFO, "内容长度：" + str(len(xaml)) + " 字符")

    found = []
    for ph in PLACEHOLDERS:
        if ph in xaml:
            found.append(ph)

    if not found:
        print_result(OK, "所有占位符都被替换了")
        return True
    else:
        print_result(FAIL, "发现未替换的占位符：")
        for ph in found:
            for i, line in enumerate(xaml.split("\n"), 1):
                if ph in line:
                    print("        第 " + str(i) + " 行：" + ph)
                    break
        return False


def check_version_endpoint():
    print_header("7. 版本号端点检查")

    url = SERVER_URL + "/Custom.xaml.version"

    try:
        v1 = requests.get(url, timeout=10, headers={"Cache-Control": "no-cache"}).text.strip()
        time.sleep(1.5)
        v2 = requests.get(url, timeout=10, headers={"Cache-Control": "no-cache"}).text.strip()
    except Exception as e:
        print_result(FAIL, "请求失败：" + str(e))
        return False

    print_result(INFO, "第一次：" + v1)
    print_result(INFO, "第二次：" + v2)

    if v1 != v2:
        print_result(OK, "版本号动态变化（PCL 会重新下载主页）")
        return True
    else:
        print_result(FAIL, "两次返回相同，中间件可能没生效")
        return False


def check_local_custom_xaml():
    print_header("8. 本地 Custom.xaml 检查")

    if not CUSTOM_XAML.exists():
        print_result(WARN, "本地 Custom.xaml 不存在（Actions 还没跑过？）")
        return True

    try:
        xaml = CUSTOM_XAML.read_text(encoding="utf-8")
    except Exception as e:
        print_result(FAIL, "读取失败：" + str(e))
        return False

    expected = ["__QUOTE__", "__SCORE__", "__DATE_YEAR__"]
    found = [ph for ph in expected if ph in xaml]

    if found:
        print_result(OK, "本地文件保留占位符（正常）：" + ", ".join(found))
    else:
        print_result(WARN, "本地文件里没有占位符，可能 Actions 生成逻辑不对")

    print_result(INFO, "文件大小：" + str(len(xaml)) + " 字符")
    return True


def check_actions_log():
    print_header("9. GitHub Actions 日志")
    print_result(INFO, "手动查看地址：")
    print("        https://github.com/wlasfjdskfj/pcl-homepage/actions")
    print()
    print_result(INFO, "如果最近一次是红色 ❌，点进去看报错信息")


# ============ 主流程 ============

def main():
    print()
    print("=" * 60)
    print("  PCL 主页诊断工具")
    print("=" * 60)
    print("  项目目录：" + str(BASE_DIR))

    results = []

    results.append(("文件检查", check_file_exists()))
    results.append(("generate.py 语法", check_generate_py_syntax()))
    results.append(("_middleware.js 语法", check_middleware_js_syntax()))
    results.append(("中间件替换逻辑", check_middleware_placeholders()))
    results.append(("IP 检测与分数验证", check_ip_and_score()))
    results.append(("服务器响应", check_server_response()))
    results.append(("版本号端点", check_version_endpoint()))
    results.append(("本地 Custom.xaml", check_local_custom_xaml()))

    check_actions_log()

    print_header("诊断汇总")

    fail_count = 0
    for name, ok in results:
        if ok:
            print_result(OK, name)
        else:
            print_result(FAIL, name)
            fail_count += 1

    print()
    if fail_count == 0:
        print("  ✅ 全部通过，主页应该正常工作")
        print()
        print("  如果 PCL 里仍然显示异常：")
        print("  1. 关闭 PCL")
        print("  2. 删除 %appdata%\\PCL\\Cache 文件夹")
        print("  3. 重开 PCL 刷新主页")
    else:
        print("  ❌ 有 " + str(fail_count) + " 项失败，请按上面的提示修复")

    print()
    input("按回车键退出...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n已取消")
    except Exception as e:
        print("\n诊断工具异常：" + str(e))
        import traceback
        traceback.print_exc()
        input("\n按回车键退出...")
