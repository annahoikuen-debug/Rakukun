"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [needMfa, setNeedMfa] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload: Record<string, string> = { email, password };
    if (needMfa && mfaToken) payload.mfaToken = mfaToken;
    const res = await signIn("credentials", { ...payload, redirect: false });
    if (res?.error) {
      // Password-only attempt failed: this may be an MFA-enabled account.
      // Reveal the second-factor field so the user can complete the challenge.
      if (!needMfa) setNeedMfa(true);
      setError(needMfa ? "認証に失敗しました（コードを確認してください）" : "Invalid credentials");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-xl font-semibold">Sign in</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {needMfa && (
          <input className="w-full border p-2 rounded" placeholder="MFA code (6 digits or recovery code)" value={mfaToken} onChange={(e) => setMfaToken(e.target.value)} autoFocus />
        )}
        <button className="w-full bg-black text-white p-2 rounded" type="submit">Sign in</button>
        <p className="text-sm"><a href="/signup" className="underline">Create account</a></p>
      </form>
    </div>
  );
}