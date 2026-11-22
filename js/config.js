// Firebase の設定（ウェブ用の apiKey は公開前提の値なので、リポジトリに入れて問題ありません。守りは database.rules.json で行います）
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBW_FXVwbgXxlCiHwxiiJwDTyt9cjOitQc",
  authDomain: "zhoulab-xmas-party.firebaseapp.com",
  databaseURL: "https://zhoulab-xmas-party-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "zhoulab-xmas-party",
  storageBucket: "zhoulab-xmas-party.firebasestorage.app",
  messagingSenderId: "87340203650",
  appId: "1:87340203650:web:f50802ffacf94945f13e9b",
};

// 管理者として使う Google アカウント（追加するときは database.rules.json も作り直す：python3 tools/make_rules.py a@x.com b@y.com）
export const ADMIN_EMAILS = ["whx121340@gmail.com"];
