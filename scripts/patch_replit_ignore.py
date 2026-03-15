import re
import sys

IGNORE_PATHS = [
    ".pythonlibs/",
    "node_modules/",
    "client/",
    "script/",
    "scripts/",
    ".local/",
    ".git/",
    ".cache/",
    ".config/",
    ".upm/",
    "attached_assets/",
    "generated_videos/",
    "voice_samples/",
    "tts_server/",
    "server/",
    "shared/",
    "*.md",
    "*.log",
    ".gitignore",
    ".prettierrc",
    "tsconfig.json",
    "drizzle.config.ts",
    "vite.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "components.json",
    "theme.json",
    "get_diff.sh",
    "uv.lock",
    "pyproject.toml",
    "main.py",
]

def build_ignore_line():
    items = ", ".join(f'"{p}"' for p in IGNORE_PATHS)
    return f"ignorePaths = [{items}]"

def patch():
    with open(".replit", "r") as f:
        content = f.read()

    if "ignorePaths" in content:
        print("ignorePaths already present in .replit, checking if update needed...")
        expected = build_ignore_line()
        if expected in content:
            print("ignorePaths is already up to date")
            return
        content = re.sub(r"^ignorePaths\s*=\s*\[.*?\]\s*\n?", "", content, flags=re.MULTILINE | re.DOTALL)

    new_line = build_ignore_line() + "\n"

    m = re.search(r'^build\s*=\s*\[.*?\]\s*$', content, re.MULTILINE)
    if m:
        insert_pos = m.end()
        content = content[:insert_pos] + "\n" + new_line + content[insert_pos:]
    elif "[deployment]" in content:
        idx = content.index("[deployment]")
        end_of_section = content.find("\n[", idx + 1)
        if end_of_section == -1:
            content = content.rstrip() + "\n" + new_line
        else:
            content = content[:end_of_section] + new_line + content[end_of_section:]
    else:
        print("ERROR: No [deployment] section found in .replit", file=sys.stderr)
        sys.exit(1)

    with open(".replit", "w") as f:
        f.write(content)

    with open(".replit", "r") as f:
        verify = f.read()
    if "ignorePaths" not in verify:
        print("ERROR: Failed to write ignorePaths to .replit", file=sys.stderr)
        sys.exit(1)

    print("Successfully added ignorePaths to .replit [deployment] section")

if __name__ == "__main__":
    patch()
