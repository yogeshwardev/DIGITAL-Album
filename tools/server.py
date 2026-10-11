"""Serves the website on this PC and on the home Wi-Fi so phones can open it too.

Supports HTTP Range requests, which browsers need to jump around inside long videos.
Run through "Start Show.bat".
"""
import json
import os
import re
import socket
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = 8080
AUDIO = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".flac"}


def write_playlist():
    music = ROOT / "media" / "music"
    music.mkdir(parents=True, exist_ok=True)
    songs = [{"src": f"media/music/{p.name}", "title": p.stem}
             for p in sorted(music.iterdir()) if p.suffix.lower() in AUDIO]
    (music / "playlist.js").write_text("window.PLAYLIST = " + json.dumps(songs, ensure_ascii=False, indent=1) + ";\n",
                                       encoding="utf-8")
    return len(songs)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        if not self.path.split("?")[0].lower().endswith((".mp4", ".jpg")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        if self.path.split("?")[0].endswith("/media/music/playlist.js"):
            write_playlist()
        path = self.translate_path(self.path)
        match = re.match(r"bytes=(\d*)-(\d*)$", self.headers.get("Range", ""))
        if not match or not os.path.isfile(path):
            self._remaining = None
            return super().send_head()
        size = os.path.getsize(path)
        start = int(match.group(1)) if match.group(1) else max(0, size - int(match.group(2) or 0))
        end = int(match.group(2)) if match.group(1) and match.group(2) else size - 1
        end = min(end, size - 1)
        if start >= size:
            self.send_error(416)
            return None
        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, dest):
        remaining = getattr(self, "_remaining", None)
        try:
            if remaining is None:
                return super().copyfile(source, dest)
            while remaining > 0:
                chunk = source.read(min(1 << 20, remaining))
                if not chunk:
                    break
                dest.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    n = write_playlist()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    ip = lan_ip()
    print("\n  *  Wedding website is running  *\n")
    print(f"  On this computer : http://localhost:{PORT}")
    print(f"  On phones (same Wi-Fi) : http://{ip}:{PORT}")
    print(f"  Songs found in media\\music : {n}")
    print("\n  Keep this window open while watching. Close it to stop.\n")
    if "--no-browser" not in sys.argv:
        webbrowser.open(f"http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
