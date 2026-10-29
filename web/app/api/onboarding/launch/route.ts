import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { getScenario } from "@/lib/scenarios";
import { toOrgErrorStatus } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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
    return NextResponse.json({ error: (e as Error).message }, { status: toOrgErrorStatus(e) });
  }

  const body = await req.json();
  const { name, scenarioKey, pageName, smtpName, groupName, url, mode, sendByDate } = body ?? {};
  const staggered = mode === "staggered";
  if (staggered && !sendByDate) {
    return NextResponse.json({ error: "分散配信には終了日時（sendByDate）が必要です" }, { status: 400 });
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
  } catch {
    // template may already exist; ignore
  }

  // Ensure a landing page exists with credential capture disabled
  try {
    await client.createPage({
      name: pageName || "training-landing",
      html: "<html><body>loading...</body></html>",
      capture_credentials: false,
      capture_passwords: false,
    });
  } catch {
    // page may already exist; ignore
  }

  const payload = {
    name,
    template: { name: templateName },
    page: { name: pageName || "training-landing" },
    smtp: { name: smtpName },
    groups: [{ name: groupName }],
    url,
    send_by_date: sendByDate,
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
      startDate: new Date(),
      sendByDate: sendByDate && !isNaN(new Date(sendByDate).getTime()) ? new Date(sendByDate) : null,
    },
  });

  // Create result rows for each target employee
  const employees = await prisma.targetEmployee.findMany({ where: { tenantId: org.id } });
  if (employees.length) {
    await prisma.trainingResult.createMany({
      data: employees.map((e:any) => ({
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

  return NextResponse.json({ campaignId: created.id, trainingCampaignId: tc.id });
}