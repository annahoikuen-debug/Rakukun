import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PartnersPage() {
  const session = await auth();
  const userId = session!.userId as string;
  const { org } = await requireOrg(userId);

  // Only partner (parent) tenants can access the partner management UI.
  if (org.plan !== "PARTNER") {
    redirect("/dashboard");
  }

  const children = await prisma.tenant.findMany({
    where: { parentId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { employees: true, campaigns: true, memberships: true } },
    },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">パートナー（代理店）管理</h1>
      <p className="text-sm text-gray-500 mb-6">
        親テナント: <strong>{org.name}</strong>（{children.length} 社の子テナントを管理中）
      </p>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">子テナント一覧</h2>
        {children.length === 0 ? (
          <p className="text-sm text-gray-500">登録されている子テナントはありません。</p>
        ) : (
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-2 text-left">企業名</th>
                <th className="p-2 text-left">スラッグ</th>
                <th className="p-2 text-center">社員数</th>
                <th className="p-2 text-center">キャンペーン数</th>
                <th className="p-2 text-left">プラン</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child) => (
                <tr key={child.id} className="border-b">
                  <td className="p-2">{child.name}</td>
                  <td className="p-2">{child.slug}</td>
                  <td className="p-2 text-center">{child._count.employees}</td>
                  <td className="p-2 text-center">{child._count.campaigns}</td>
                  <td className="p-2">{child.plan}</td>
                  <td className="p-2">
                    <form action="/api/active-org" method="POST" className="inline">
                      <input type="hidden" name="orgId" value={child.id} />
                      <button type="submit" className="border px-2 py-1 rounded text-sm hover:bg-gray-50">
                        テナント切替
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8">
        <Link href="/dashboard/settings" className="border px-4 py-2 rounded text-sm">
          設定に戻る
        </Link>
      </div>
    </div>
  );
}
