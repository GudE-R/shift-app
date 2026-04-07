import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export function PasswordScreen() {
  const { hasPassword, initialized, init, setPassword, checkPassword } = useAuthStore();
  const [password, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    init();
  }, []);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hasPassword) {
      if (password.length < 4) {
        setError("パスワードは4文字以上で設定してください");
        return;
      }
      if (password !== confirm) {
        setError("パスワードが一致しません");
        return;
      }
      await setPassword(password);
    } else {
      const valid = await checkPassword(password);
      if (!valid) {
        setError("パスワードが正しくありません");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle>{hasPassword ? "ShiftCraft" : "パスワード設定"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {hasPassword ? "パスワードを入力してください" : "初回のパスワードを設定してください"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              autoFocus
            />
            {!hasPassword && (
              <Input
                type="password"
                placeholder="パスワード（確認）"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {hasPassword ? "ログイン" : "設定"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
