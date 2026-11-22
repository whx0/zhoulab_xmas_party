// Firebase コンソール →「プロジェクトの設定」→「マイアプリ（ウェブ）」の設定をここに貼る。
// apiKey が空のままだと「ローカルお試しモード」（同じPCの複数タブだけで動く）になる。
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",   // 例: https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app
  projectId: "",
  appId: "",
};

// 管理者として使う Google アカウントのメールアドレス（database.rules.json にも同じものを書く）
export const ADMIN_EMAILS = [];
