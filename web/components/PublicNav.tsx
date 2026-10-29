import Link from "next/link";
import { auth } from "@/auth";
import MobileMenu from "@/components/MobileMenu";

export default async function PublicNav() {
  const session = await auth();
  const userId = session?.userId;
  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">Rakukun <span className="text-indigo-600">SecTraining</span></Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/#features" className="hover:text-indigo-600">特徴</Link>
          <Link href="/#pricing" className="hover:text-indigo-600">料金</Link>
          <Link href="/manual" className="hover:text-indigo-600">マニュアル</Link>
          <Link href="/faq" className="hover:text-indigo-600">Q&amp;A</Link>
          {userId ? (
            <Link href="/dashboard" className="bg-black text-white px-4 py-2 rounded">ダッシュボード</Link>
          ) : (
            <>
              <Link href="/signin" className="hover:text-indigo-600">サインイン</Link>
              <Link href="/signup" className="bg-black text-white px-4 py-2 rounded">無料で始める</Link>
            </>
          )}
        </nav>

        <MobileMenu userId={userId} />
      </div>
    </header>
  );
}
