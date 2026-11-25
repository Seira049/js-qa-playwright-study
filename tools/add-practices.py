"""Insert practice blocks at the end of topic sections.

Usage: python3 add-practices.py <chapter.md> <practices.md>

practices.md holds sections like:
    @@ 1.3 Printing values with console.log
    ```practice js title="..."
    ...
    ```
    ...
Each block is inserted just before the "## " heading that follows the named topic.
Running it twice doesn't add duplicates (practices are matched by title).
"""
import re
import sys

chapter_path, practices_path = sys.argv[1], sys.argv[2]
md = open(chapter_path, encoding="utf-8").read()
chunks = re.split(r"^@@ (.+)$", open(practices_path, encoding="utf-8").read(), flags=re.M)
added = 0
for topic, body in zip(chunks[1::2], chunks[2::2]):
    body = body.strip("\n")
    title = re.search(r'```practice \w+ title="([^"]+)"', body).group(1)
    if f'title="{title}"' in md:
        continue
    start = md.find(f"\n## {topic.strip()}\n")
    if start < 0:
        sys.exit(f"topic not found: {topic}")
    nxt = md.find("\n## ", start + 4)
    md = md[: nxt].rstrip("\n") + "\n\n" + body + "\n" + md[nxt:]
    added += 1
open(chapter_path, "w", encoding="utf-8").write(md)
print(f"{chapter_path}: added {added} practice(s)")
