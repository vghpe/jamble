#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import re
from urllib.parse import unquote

ROOT = os.path.abspath(os.path.dirname(__file__))
DIST = os.path.join(ROOT, 'dist')
PROFILES_DIR = os.path.join(DIST, 'profiles')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__profiles':
            try:
                files = [f for f in os.listdir(PROFILES_DIR) if f.endswith('.json')]
                files.sort()
                data = {'profiles': files}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
            return
        if self.path == '/__skill_presets':
            try:
                skills = {}
                if os.path.isdir(os.path.join(DIST, 'skill-presets')):
                    for sid in os.listdir(os.path.join(DIST, 'skill-presets')):
                        sdir = os.path.join(DIST, 'skill-presets', sid)
                        if os.path.isdir(sdir):
                            skills[sid] = sorted([f for f in os.listdir(sdir) if f.endswith('.json')])
                data = {'skills': skills}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
            return
        if self.path.startswith('/__skill_presets/'):
            sid = self.path[len('/__skill_presets/'):].strip('/')
            target = os.path.join(DIST, 'skill-presets', sid)
            try:
                if not os.path.isdir(target):
                    self.send_response(404); self.end_headers(); return
                files = [f for f in os.listdir(target) if f.endswith('.json')]
                files.sort()
                data = {'skill': sid, 'presets': files}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
            return
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        m = re.match(r'^/__profiles/(.+)$', self.path)
        if not m:
            self.send_response(404)
            self.end_headers()
            return
        name = unquote(m.group(1))
        # sanitize filename: no slashes, must end with .json
        if '/' in name or '\\' in name or not name.endswith('.json'):
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'Invalid profile name')
            return
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length)
        try:
            obj = json.loads(body.decode('utf-8'))
        except Exception:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'Invalid JSON')
            return
        os.makedirs(PROFILES_DIR, exist_ok=True)
        path = os.path.join(PROFILES_DIR, name)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(obj, f, indent=2)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK')
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

if __name__ == '__main__':
    import sys
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except Exception:
            pass
    os.chdir(ROOT)
    with socketserver.TCPServer(('', port), Handler) as httpd:
        print(f"Serving at http://localhost:{port}")
        httpd.serve_forever()
