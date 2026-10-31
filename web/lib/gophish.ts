import type {
  GophishResponse,
  Group,
  Template,
  Page,
  SendingProfile,
  Campaign,
  CampaignResultsResponse,
  CampaignSummary,
  CampaignSummaryListResponse,
  GophishUser,
} from "@/types/gophish";

export type { GophishResponse };

export class GophishClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(opts: { baseUrl: string; apiKey: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: GophishResponse<T> | null = null;
    try {
      parsed = text ? (JSON.parse(text) as GophishResponse<T>) : null;
    } catch {
      if (!res.ok) throw new Error(`Gophish ${method} ${path}: ${res.status} ${text}`);
      return text as unknown as T;
    }
    if (!res.ok) {
      throw new Error(`Gophish ${method} ${path}: ${res.status} ${parsed?.message ?? text}`);
    }
    if (parsed && parsed.success === false) {
      throw new Error(parsed.message || "Gophish request failed");
    }
    return (parsed?.data ?? parsed) as T;
  }

  // Campaigns
  getCampaigns(): Promise<Campaign[]> { return this.request<Campaign[]>("GET", "/campaigns/"); }
  getCampaign(id: number): Promise<Campaign> { return this.request<Campaign>("GET", `/campaigns/${id}`); }
  createCampaign(payload: unknown): Promise<Campaign> { return this.request<Campaign>("POST", "/campaigns/", payload); }
  deleteCampaign(id: number): Promise<unknown> { return this.request("DELETE", `/campaigns/${id}`); }
  completeCampaign(id: number): Promise<unknown> { return this.request("GET", `/campaigns/${id}/complete`); }
  getCampaignResults(id: number): Promise<CampaignResultsResponse> { return this.request<CampaignResultsResponse>("GET", `/campaigns/${id}/results`); }
  getCampaignSummary(id: number): Promise<CampaignSummary> { return this.request<CampaignSummary>("GET", `/campaigns/${id}/summary`); }
  getCampaignsSummary(): Promise<CampaignSummaryListResponse> { return this.request<CampaignSummaryListResponse>("GET", "/campaigns/summary"); }

  // Templates
  getTemplates(): Promise<Template[]> { return this.request<Template[]>("GET", "/templates/"); }
  getTemplate(id: number): Promise<Template> { return this.request<Template>("GET", `/templates/${id}`); }
  createTemplate(payload: unknown): Promise<Template> { return this.request<Template>("POST", "/templates/", payload); }
  updateTemplate(id: number, payload: unknown): Promise<Template> { return this.request<Template>("PUT", `/templates/${id}`, payload); }
  deleteTemplate(id: number): Promise<unknown> { return this.request("DELETE", `/templates/${id}`); }

  // Pages
  getPages(): Promise<Page[]> { return this.request<Page[]>("GET", "/pages/"); }
  getPage(id: number): Promise<Page> { return this.request<Page>("GET", `/pages/${id}`); }
  createPage(payload: unknown): Promise<Page> { return this.request<Page>("POST", "/pages/", payload); }
  updatePage(id: number, payload: unknown): Promise<Page> { return this.request<Page>("PUT", `/pages/${id}`, payload); }
  deletePage(id: number): Promise<unknown> { return this.request("DELETE", `/pages/${id}`); }

  // Groups
  getGroups(): Promise<Group[]> { return this.request<Group[]>("GET", "/groups/"); }
  getGroup(id: number): Promise<Group> { return this.request<Group>("GET", `/groups/${id}`); }
  createGroup(payload: unknown): Promise<Group> { return this.request<Group>("POST", "/groups/", payload); }
  updateGroup(id: number, payload: unknown): Promise<Group> { return this.request<Group>("PUT", `/groups/${id}`, payload); }
  deleteGroup(id: number): Promise<unknown> { return this.request("DELETE", `/groups/${id}`); }

  // Sending profiles (SMTP)
  getSendingProfiles(): Promise<SendingProfile[]> { return this.request<SendingProfile[]>("GET", "/smtp/"); }
  getSendingProfile(id: number): Promise<SendingProfile> { return this.request<SendingProfile>("GET", `/smtp/${id}`); }
  createSendingProfile(payload: unknown): Promise<SendingProfile> { return this.request<SendingProfile>("POST", "/smtp/", payload); }
  updateSendingProfile(id: number, payload: unknown): Promise<SendingProfile> { return this.request<SendingProfile>("PUT", `/smtp/${id}`, payload); }
  deleteSendingProfile(id: number): Promise<unknown> { return this.request("DELETE", `/smtp/${id}`); }

  // Admin helpers
  createUser(payload: unknown): Promise<GophishUser> { return this.request<GophishUser>("POST", "/users/", payload); }
  sendTestEmail(payload: unknown): Promise<{ message: string; success: boolean }> { return this.request<{ message: string; success: boolean }>("POST", "/util/send_test_email", payload); }
}

export function adminClient(): GophishClient {
  return new GophishClient({
    baseUrl: process.env.GOPHISH_ADMIN_URL ?? "http://localhost:3333",
    apiKey: process.env.GOPHISH_ADMIN_API_KEY ?? "",
  });
}

export async function orgClient(orgId: string): Promise<GophishClient> {
  const { prisma } = await import("./prisma");
  const { decrypt } = await import("./crypto");
  const org = await prisma.tenant.findUnique({ where: { id: orgId } });
  if (!org?.gophishApiKey) throw new Error("Tenant not provisioned with Gophish");
  return new GophishClient({
    baseUrl: process.env.GOPHISH_ADMIN_URL ?? "http://localhost:3333",
    apiKey: decrypt(org.gophishApiKey),
  });
}