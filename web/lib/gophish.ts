export type GophishResponse<T = unknown> = {
  message: string;
  success: boolean;
  data?: T;
};

export type GophishClientOptions = {
  baseUrl: string;
  apiKey: string;
};

export class GophishClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(opts: GophishClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
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
  getCampaigns() { return this.request<any[]>("GET", "/campaigns/"); }
  getCampaign(id: number) { return this.request<any>("GET", `/campaigns/${id}`); }
  createCampaign(payload: unknown) { return this.request<any>("POST", "/campaigns/", payload); }
  deleteCampaign(id: number) { return this.request<any>("DELETE", `/campaigns/${id}`); }
  completeCampaign(id: number) { return this.request<any>("GET", `/campaigns/${id}/complete`); }
  getCampaignResults(id: number) { return this.request<any>("GET", `/campaigns/${id}/results`); }
  getCampaignSummary(id: number) { return this.request<any>("GET", `/campaigns/${id}/summary`); }
  getCampaignsSummary() { return this.request<any>("GET", "/campaigns/summary"); }

  // Templates
  getTemplates() { return this.request<any[]>("GET", "/templates/"); }
  getTemplate(id: number) { return this.request<any>("GET", `/templates/${id}`); }
  createTemplate(payload: unknown) { return this.request<any>("POST", "/templates/", payload); }
  updateTemplate(id: number, payload: unknown) { return this.request<any>("PUT", `/templates/${id}`, payload); }
  deleteTemplate(id: number) { return this.request<any>("DELETE", `/templates/${id}`); }

  // Pages
  getPages() { return this.request<any[]>("GET", "/pages/"); }
  getPage(id: number) { return this.request<any>("GET", `/pages/${id}`); }
  createPage(payload: unknown) { return this.request<any>("POST", "/pages/", payload); }
  updatePage(id: number, payload: unknown) { return this.request<any>("PUT", `/pages/${id}`, payload); }
  deletePage(id: number) { return this.request<any>("DELETE", `/pages/${id}`); }

  // Groups
  getGroups() { return this.request<any[]>("GET", "/groups/"); }
  getGroup(id: number) { return this.request<any>("GET", `/groups/${id}`); }
  createGroup(payload: unknown) { return this.request<any>("POST", "/groups/", payload); }
  updateGroup(id: number, payload: unknown) { return this.request<any>("PUT", `/groups/${id}`, payload); }
  deleteGroup(id: number) { return this.request<any>("DELETE", `/groups/${id}`); }

  // Sending profiles (SMTP)
  getSendingProfiles() { return this.request<any[]>("GET", "/smtp/"); }
  getSendingProfile(id: number) { return this.request<any>("GET", `/smtp/${id}`); }
  createSendingProfile(payload: unknown) { return this.request<any>("POST", "/smtp/", payload); }
  updateSendingProfile(id: number, payload: unknown) { return this.request<any>("PUT", `/smtp/${id}`, payload); }
  deleteSendingProfile(id: number) { return this.request<any>("DELETE", `/smtp/${id}`); }

  // Admin helpers
  createUser(payload: unknown) { return this.request<any>("POST", "/users/", payload); }
  sendTestEmail(payload: unknown) { return this.request<any>("POST", "/util/send_test_email", payload); }
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