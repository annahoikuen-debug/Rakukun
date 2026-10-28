"use client";
import { useActionState } from "react";
import { signupAction } from "./actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, null as any);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form action={action} className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-xl font-semibold">Create account</h1>
        {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
        <input name="name" className="w-full border p-2 rounded" placeholder="Name" />
        <input name="email" required className="w-full border p-2 rounded" placeholder="Email" />
        <input name="password" required type="password" className="w-full border p-2 rounded" placeholder="Password (min 8)" />
        <input name="orgName" required className="w-full border p-2 rounded" placeholder="Tenant name" />
        <button disabled={pending} className="w-full bg-black text-white p-2 rounded" type="submit">
          {pending ? "Creating..." : "Sign up"}
        </button>
        <p className="text-sm"><a href="/signin" className="underline">Sign in</a></p>
      </form>
    </div>
  );
}