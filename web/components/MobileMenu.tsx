"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface MobileAuthLinksProps {
  userId: string | undefined;
}

function MobileAuthLinks({ userId }: MobileAuthLinksProps) {
  return userId ? (
    <Link
      href="/dashboard"
      className="block px-3 py-2 rounded bg-black text-white text-center hover:bg-gray-800 transition"
    >
      ダッシュボード
    </Link>
  ) : (
    <>
      <Link
        href="/signin"
        className="block px-3 py-2 rounded hover:bg-gray-100 hover:text-indigo-600 transition"
      >
        サインイン
      </Link>
      <Link
        href="/signup"
        className="block px-3 py-2 rounded bg-black text-white text-center hover:bg-gray-800 transition"
      >
        無料で始める
      </Link>
    </>
  );
}

export default function MobileMenu({ userId }: { userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="md:hidden p-2 text-gray-600 hover:text-indigo-600"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {open && (
        <div className="md:hidden fixed inset-x-0 top-16 border-t border-b bg-white/90 backdrop-blur z-20">
          <div className="max-w-5xl mx-auto px-6 py-4 space-y-2">
            <Link
              href="/#features"
              className="block px-3 py-2 rounded hover:bg-gray-100 hover:text-indigo-600 transition"
            >
              特徴
            </Link>
            <Link
              href="/#pricing"
              className="block px-3 py-2 rounded hover:bg-gray-100 hover:text-indigo-600 transition"
            >
              料金
            </Link>
            <Link
              href="/manual"
              className="block px-3 py-2 rounded hover:bg-gray-100 hover:text-indigo-600 transition"
            >
              マニュアル
            </Link>
            <Link
              href="/faq"
              className="block px-3 py-2 rounded hover:bg-gray-100 hover:text-indigo-600 transition"
            >
              Q&amp;A
            </Link>
            <MobileAuthLinks userId={userId} />
          </div>
        </div>
      )}
    </>
  );
}
