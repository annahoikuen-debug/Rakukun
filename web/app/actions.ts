"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { OrgAccessError } from "@/lib/errors";
import { auditLog } from "@/lib/audit";
import { templateSchema, pageSchema, groupSchema, smtpSchema, campaignSchema } from "@/lib/validators";
import { assertEmailMatchesTenant } from "@/lib/domain-guard";
import { revalidatePath } from "next/cache";

async function ctx() {
  const session = await auth();
  if (!session?.userId) throw new OrgAccessError("Unauthorized", 401);
  const userId = session.userId as string;
  const orgId = await (await import("@/lib/org")).getActiveOrgId(userId);
  if (!orgId) throw new OrgAccessError("No org", 400);
  const { org } = await requireOrg(userId, orgId);
  const client = await orgClient(org.id);
  return { userId, org, client };
}

// Templates
export async function createTemplateAction(formData: FormData) {
  const { client, userId, org } = await ctx();
  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    text: formData.get("text") ?? "",
    html: formData.get("html"),
    envelope_sender: formData.get("envelope_sender") || undefined,
  });
  if (!parsed.success) return { error: "Invalid input" };
  await client.createTemplate(parsed.data);
  revalidatePath("/dashboard/templates");
  await auditLog({
    userId,
    action: "template.create",
    entityType: "Template",
    metadata: { name: parsed.data.name },
    tenantId: org.id,
  }).catch(() => {});
  return { ok: true };
}

export async function deleteTemplateAction(id: number) {
  const { client, userId, org } = await ctx();
  await client.deleteTemplate(id);
  revalidatePath("/dashboard/templates");
  await auditLog({
    userId,
    action: "template.delete",
    entityType: "Template",
    entityId: String(id),
    tenantId: org.id,
  }).catch(() => {});
}

// Pages (landing pages) - capture flags forced false
export async function createPageAction(formData: FormData) {
  const { client, userId, org } = await ctx();
  const parsed = pageSchema.safeParse({
    name: formData.get("name"),
    html: formData.get("html"),
    redirect_url: formData.get("redirect_url") ?? "",
  });
  if (!parsed.success) return { error: "Invalid input" };
  await client.createPage({
    name: parsed.data.name,
    html: parsed.data.html,
    capture_credentials: false,
    capture_passwords: false,
    redirect_url: parsed.data.redirect_url,
  });
  revalidatePath("/dashboard/pages");
  await auditLog({
    userId,
    action: "page.create",
    entityType: "Page",
    metadata: { name: parsed.data.name },
    tenantId: org.id,
  }).catch(() => {});
  return { ok: true };
}

export async function deletePageAction(id: number) {
  const { client, userId, org } = await ctx();
  await client.deletePage(id);
  revalidatePath("/dashboard/pages");
  await auditLog({
    userId,
    action: "page.delete",
    entityType: "Page",
    entityId: String(id),
    tenantId: org.id,
  }).catch(() => {});
}

// Groups
export async function createGroupAction(formData: FormData) {
  const { client, userId, org } = await ctx();
  const name = String(formData.get("name") ?? "");
  const targetsRaw = String(formData.get("targets") ?? "");
  const targets = targetsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, first, last, position] = line.split(",").map((s) => s.trim());
      return { email, first_name: first ?? "", last_name: last ?? "", position: position ?? "" };
    });
  const parsed = groupSchema.safeParse({ name, targets });
  if (!parsed.success) return { error: "Invalid input" };

  // Enforce tenant-domain restriction (no freemail / arbitrary external targets).
  for (const t of parsed.data.targets) {
    const domainErr = assertEmailMatchesTenant(t.email, org.domain);
    if (domainErr) return { error: `${t.email}: ${domainErr}` };
  }

  await client.createGroup(parsed.data);
  revalidatePath("/dashboard/groups");
  await auditLog({
    userId,
    action: "group.create",
    entityType: "Group",
    metadata: { name, targetCount: parsed.data.targets.length },
    tenantId: org.id,
  }).catch(() => {});
  return { ok: true };
}

export async function deleteGroupAction(id: number) {
  const { client, userId, org } = await ctx();
  await client.deleteGroup(id);
  revalidatePath("/dashboard/groups");
  await auditLog({
    userId,
    action: "group.delete",
    entityType: "Group",
    entityId: String(id),
    tenantId: org.id,
  }).catch(() => {});
}

// Sending profiles
export async function createSmtpAction(formData: FormData) {
  const { client, userId, org } = await ctx();
  const parsed = smtpSchema.safeParse({
    name: formData.get("name"),
    host: formData.get("host"),
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
    from_address: formData.get("from_address"),
    ignore_cert_errors: formData.get("ignore_cert_errors") === "on",
  });
  if (!parsed.success) return { error: "Invalid input" };
  await client.createSendingProfile({ ...parsed.data, interface_type: "SMTP" });
  revalidatePath("/dashboard/sending-profiles");
  await auditLog({
    userId,
    action: "smtp.create",
    entityType: "Smtp",
    metadata: { name: parsed.data.name, host: parsed.data.host },
    tenantId: org.id,
  }).catch(() => {});
  return { ok: true };
}

export async function deleteSmtpAction(id: number) {
  const { client, userId, org } = await ctx();
  await client.deleteSendingProfile(id);
  revalidatePath("/dashboard/sending-profiles");
  await auditLog({
    userId,
    action: "smtp.delete",
    entityType: "Smtp",
    entityId: String(id),
    tenantId: org.id,
  }).catch(() => {});
}

// Campaigns
export async function createCampaignAction(formData: FormData) {
  const { client, userId, org } = await ctx();
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    templateName: formData.get("templateName"),
    pageName: formData.get("pageName"),
    smtpName: formData.get("smtpName"),
    groupNames: String(formData.get("groupNames") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    url: formData.get("url"),
    launch_date: formData.get("launch_date") || undefined,
    send_by_date: formData.get("send_by_date") || undefined,
  });
  if (!parsed.success) return { error: "Invalid input" };
  const d = parsed.data;
  const payload = {
    name: d.name,
    template: { name: d.templateName },
    page: { name: d.pageName },
    smtp: { name: d.smtpName },
    groups: d.groupNames.map((n) => ({ name: n })),
    url: d.url,
    launch_date: d.launch_date,
    send_by_date: d.send_by_date,
  };
  const created = (await client.createCampaign(payload)) as any;
  if (!created?.id) {
    return { error: "Gophish did not return a campaign id" };
  }
  await prisma.campaignLink.create({
    data: {
      tenantId: org.id,
      gophishCampaignId: created.id,
      name: d.name,
      status: created.status ?? "Created",
    },
  });
  // Also create TrainingCampaign + TrainingResult rows so reports/tracking work.
  try {
    const tc = await prisma.trainingCampaign.create({
      data: {
        tenantId: org.id,
        title: d.name,
        templateKey: d.templateName,
        gophishCampaignId: created.id,
        status: created.status ?? "SCHEDULED",
        startDate: d.launch_date ? new Date(d.launch_date) : new Date(),
        sendByDate: d.send_by_date ? new Date(d.send_by_date) : null,
      },
    });
    const employees = await prisma.targetEmployee.findMany({ where: { tenantId: org.id } });
    // Pre-send suppression filter — exclude suppressed employees from results.
    const suppressedEmails = await prisma.suppressedEmail.findMany();
    const suppressed = new Set(suppressedEmails.map((s) => s.email));
    const eligibleEmployees = employees.filter((e) => !suppressed.has(e.email));
    if (eligibleEmployees.length) {
      await prisma.trainingResult.createMany({
        data: eligibleEmployees.map((e) => ({
          trainingCampaignId: tc.id,
          targetEmployeeId: e.id,
          isHumanClicked: false,
          isQuizCompleted: false,
        })),
        skipDuplicates: true,
      });
    }
    const { syncTrainingResults } = await import("@/lib/rid-sync");
    await syncTrainingResults(org.id, tc.id, created.id, client);
  } catch (e) {
    console.error("TrainingCampaign create failed:", e);
    return { ok: true, warning: "TrainingCampaign の作成に失敗しました" };
  }
  revalidatePath("/dashboard/campaigns");
  await auditLog({
    userId,
    action: "campaign.create",
    entityType: "Campaign",
    entityId: String(created.id),
    metadata: { name: d.name, status: created.status },
    tenantId: org.id,
  }).catch(() => {});
  return { ok: true };
}

export async function deleteCampaignAction(id: number) {
  const { client, userId, org } = await ctx();
  // Verify tenant ownership before deleting in Gophish.
  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: id, tenantId: org.id },
  });
  const link = await prisma.campaignLink.findFirst({
    where: { gophishCampaignId: id, tenantId: org.id },
  });
  if (!tc && !link) throw new OrgAccessError("Not found in this tenant", 404);
  // Clean up DB rows even if Gophish 404s (already deleted) — otherwise the
  // unique constraints on gophishCampaignId permanently block ID reuse.
  try {
    await client.deleteCampaign(id);
  } catch (e) {
    console.error("deleteCampaignAction: gophish delete failed (continuing cleanup)", e);
  }
  await prisma.$transaction([
    prisma.trainingResult.deleteMany({ where: { trainingCampaignId: tc?.id ?? "" } }),
    prisma.trainingCampaign.deleteMany({ where: { gophishCampaignId: id, tenantId: org.id } }),
    prisma.campaignLink.deleteMany({ where: { gophishCampaignId: id, tenantId: org.id } }),
  ]);
  revalidatePath("/dashboard/campaigns");
  await auditLog({
    userId,
    action: "campaign.delete",
    entityType: "Campaign",
    entityId: String(id),
    tenantId: org.id,
  }).catch(() => {});
}

export async function completeCampaignAction(id: number) {
  const { client, userId, org } = await ctx();
  const tc = await prisma.trainingCampaign.findFirst({
    where: { gophishCampaignId: id, tenantId: org.id },
  });
  const link = await prisma.campaignLink.findFirst({
    where: { gophishCampaignId: id, tenantId: org.id },
  });
  if (!tc && !link) throw new OrgAccessError("Not found in this tenant", 404);
  await client.completeCampaign(id);
  if (tc) {
    await prisma.trainingCampaign.update({ where: { id: tc.id }, data: { status: "COMPLETED" } });
  }
  revalidatePath(`/dashboard/campaigns/${id}`);
  await auditLog({
    userId,
    action: "campaign.complete",
    entityType: "Campaign",
    entityId: String(id),
    tenantId: org.id,
  }).catch(() => {});
}