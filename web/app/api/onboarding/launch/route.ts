import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { getScenario } from "@/lib/scenarios";
import { toOrgErrorStatus, toClientMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { auditLog } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Rate limit by source IP (trusted proxy resolution).
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`launch:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId as string;
  const orgId = await (await import("@/lib/org")).getActiveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
  let org, client;
  try {
    const r = await requireOrg(userId, orgId);
    org = r.org;
    client = await orgClient(r.org.id);
  } catch (e) {
    return NextResponse.json({ error: toClientMessage(e) }, { status: toOrgErrorStatus(e) });
  }
  // Tenant-level guard against mass campaign launches.
  if (!(await rateLimit(`launch-tenant:${org.id}`, 10, 3600_000))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  const body = await req.json().catch(() => ({}));
  const { name, scenarioKey, pageName, smtpName, groupName, url, mode, sendByDate } = body ?? {};
  const staggered = mode === "staggered";
  if (staggered && !sendByDate) {
    return NextResponse.json({ error: "分散配信には終了日時（sendByDate）が必要です" }, { status: 400 });
  }
  let sendByDateObj: Date | null = null;
  if (staggered) {
    sendByDateObj = new Date(sendByDate);
    if (isNaN(sendByDateObj.getTime()) || sendByDateObj.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "sendByDate は未来の日時として指定してください" },
        { status: 400 },
      );
    }
  }
  const scenario = getScenario(scenarioKey ?? "default");
  const templateName = `scenario-${scenario.key}`;

  // Ensure the Japanese scenario template exists in Gophish
  try {
    await client.createTemplate({
      name: templateName,
      subject: scenario.subject,
      text: "",
      html: scenario.html,
    });
  } catch (e: any) {
    // ignore duplicate-name conflicts; rethrow auth/network failures
    if (!/409|already/i.test(String(e?.message ?? ""))) {
      console.error("createTemplate failed:", e);
      return NextResponse.json({ error: "テンプレート作成に失敗しました" }, { status: 500 });
    }
  }

  // Ensure a landing page exists with credential capture disabled
  try {
    await client.createPage({
      name: pageName || "training-landing",
      html: "<html><body>loading...</body></html>",
      capture_credentials: false,
      capture_passwords: false,
    });
  } catch (e: any) {
    if (!/409|already/i.test(String(e?.message ?? ""))) {
      console.error("createPage failed:", e);
      return NextResponse.json({ error: "ランディングページ作成に失敗しました" }, { status: 500 });
    }
  }

  const payload = {
    name,
    template: { name: templateName },
    page: { name: pageName || "training-landing" },
    smtp: { name: smtpName },
    groups: [{ name: groupName }],
    url,
    send_by_date: staggered ? sendByDate : undefined,
  };

  let created: any;
  try {
    created = await client.createCampaign(payload);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "launch failed" }, { status: 500 });
  }
  if (!created?.id) {
    return NextResponse.json({ error: "Gophish did not return a campaign id" }, { status: 502 });
  }

  const tc = await prisma.trainingCampaign.create({
    data: {
      tenantId: org.id,
      title: name,
      templateKey: scenario.key,
      gophishCampaignId: created.id,
      gophishGroupId: null,
      status: created?.status ?? "SCHEDULED",
      startDate: sendByDateObj ?? new Date(),
      sendByDate: sendByDateObj,
    },
  });

  // Create result rows for each target employee (excluding suppressed recipients).
  const suppressedEmails = await prisma.suppressedEmail.findMany();
  const suppressed = new Set(suppressedEmails.map((s) => s.email));
  const employees = await prisma.targetEmployee.findMany({ where: { tenantId: org.id } });
  const eligibleEmployees = employees.filter((e) => !suppressed.has(e.email));
  if (eligibleEmployees.length) {
    await prisma.trainingResult.createMany({
      data: eligibleEmployees.map((e:any) => ({
        trainingCampaignId: tc.id,
        targetEmployeeId: e.id,
        isHumanClicked: false,
        isQuizCompleted: false,
      })),
      skipDuplicates: true,
    });
  }

  // Best-effort initial mapping; scheduled campaigns get reconciled later via sync-results
  const { syncTrainingResults } = await import("@/lib/rid-sync");
  await syncTrainingResults(org.id, tc.id, created.id, client);

  await auditLog({
    userId,
    userEmail: session.user?.email ?? undefined,
    action: "campaign.launch",
    entityType: "Campaign",
    entityId: String(created.id),
    metadata: { name, scenarioKey, groupName },
    ip,
    tenantId: org.id,
  }).catch(() => {});

  return NextResponse.json({ campaignId: created.id, trainingCampaignId: tc.id });
}