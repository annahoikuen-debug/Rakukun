import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const { org, membership } = await requireOrg(userId, id);
  if (membership.role === "MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employees = await prisma.targetEmployee.findMany({ where: { tenantId: org.id } });
  await prisma.$transaction(
    employees.map((e, idx) =>
      prisma.targetEmployee.update({
        where: { id: e.id },
        data: { name: `利用者${idx + 1}`, email: `anon${idx + 1}.${e.id}@anonymized.invalid` },
      }),
    ),
  );
  return NextResponse.json({ anonymized: employees.length });
}