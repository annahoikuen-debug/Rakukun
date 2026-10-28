"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { orgClient } from "@/lib/gophish";
import { templateSchema, pageSchema, groupSchema, smtpSchema, campaignSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

async function ctx() {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");
  const userId = session.userId as string;
  const orgId = await (await import("@/lib/org")).getActiveOrgId(userId);
  if (!orgId) throw new Error("No org");
  const { org } = await requireOrg(userId, orgId);
  const client = await orgClient(org.id);
  return { userId, org, client };
}

// Templates
export async function createTemplateAction(formData: FormData) {
  const { client } = await ctx();
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
  return { ok: true };
}

export async function deleteTemplateAction(id: number) {
  const { client } = await ctx();
  await client.deleteTemplate(id);
  revalidatePath("/dashboard/templates");
}

// Pages (landing pages) - capture flags forced false
export async function createPageAction(formData: FormData) {
  const { client } = await ctx();
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
  return { ok: true };
}

export async function deletePageAction(id: number) {
  const { client } = await ctx();
  await client.deletePage(id);
  revalidatePath("/dashboard/pages");
}

// Groups
export async function createGroupAction(formData: FormData) {
  const { client } = await ctx();
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
  await client.createGroup(parsed.data);
  revalidatePath("/dashboard/groups");
  return { ok: true };
}

export async function deleteGroupAction(id: number) {
  const { client } = await ctx();
  await client.deleteGroup(id);
  revalidatePath("/dashboard/groups");
}

// Sending profiles
export async function createSmtpAction(formData: FormData) {
  const { client } = await ctx();
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
  return { ok: true };
}

export async function deleteSmtpAction(id: number) {
  const { client } = await ctx();
  await client.deleteSendingProfile(id);
  revalidatePath("/dashboard/sending-profiles");
}

// Campaigns
export async function createCampaignAction(formData: FormData) {
  const { client, org } = await ctx();
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
  revalidatePath("/dashboard/campaigns");
  return { ok: true };
}

export async function deleteCampaignAction(id: number) {
  const { client } = await ctx();
  await client.deleteCampaign(id);
  revalidatePath("/dashboard/campaigns");
}

export async function completeCampaignAction(id: number) {
  const { client } = await ctx();
  await client.completeCampaign(id);
  revalidatePath(`/dashboard/campaigns/${id}`);
}