# database.rules.json を作る：python3 tools/make_rules.py you@example.com [other@example.com ...]
import json, sys
emails = [e.lower() for e in sys.argv[1:]] or ['ADMIN_EMAIL@example.com']
A = "(auth != null && auth.token.email_verified == true && (" + " || ".join(f"auth.token.email.toLowerCase() == '{e}'" for e in emails) + "))"
AUTH = "auth != null"
OWN = "root.child('users/' + $k + '/uid').val() == auth.uid"
LEADER = "root.child('users/' + root.child('teams/' + $t + '/leader').val() + '/uid').val() == auth.uid"
PAIR = "(root.child('users/' + data.child('a').val() + '/uid').val() == auth.uid || root.child('users/' + data.child('b').val() + '/uid').val() == auth.uid)"
pub = lambda: {".read": AUTH}          # 参加者が読める・管理者だけ書ける（書き込みは root の管理者権限）
rules = {"rules": {
  ".read": A, ".write": A,
  **{k: pub() for k in ["state", "config", "timer", "rules", "questions", "results", "points", "ctime", "assets"]},
  "meta": {".read": AUTH, "userCounter": {".write": AUTH, ".validate": "newData.isNumber()"}, "teamCounter": {".write": AUTH, ".validate": "newData.isNumber()"}},
  "presence": {".read": AUTH, "$k": {".write": OWN}},
  "users": {".read": AUTH, "$k": {
    ".write": f"!data.exists() && newData.child('uid').val() == auth.uid",
    "uid": {".write": "auth != null && (!data.exists() || data.val() == auth.uid) && newData.val() == auth.uid"},
    "name": {".write": OWN},
    "team": {".write": AUTH}, "pair": {".write": AUTH}, "pairReq": {".write": AUTH}}},
  "teams": {".read": AUTH, ".write": AUTH},
  "pairs": {".read": AUTH, ".write": AUTH},
  "answers": {"$q": {"$k": {
    ".read": OWN,
    ".write": f"!data.exists() && {OWN} && root.child('questions/' + $q + '/open').val() == true",
    ".validate": "newData.child('t').val() == now"}}},
  "tools": {".read": AUTH, "solo": {"$k": {".write": OWN}}, "draft": {"$t": {".write": LEADER}}, "team": {"$t": {".write": LEADER}}},
  "spot": {".read": AUTH, "$t": {".write": LEADER}},
  "gift": {".read": AUTH, "$g": {"$p": {".write": f"data.exists() && {PAIR} && newData.child('a').val() == data.child('a').val() && newData.child('b').val() == data.child('b').val()"}}},
}}
open('database.rules.json', 'w').write(json.dumps(rules, ensure_ascii=False, indent=2) + "\n")
print('wrote database.rules.json for', emails)
