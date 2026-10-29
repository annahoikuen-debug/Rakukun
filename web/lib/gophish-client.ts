import type {
  GophishResponse,
  Group,
  GroupCreateRequest,
  GroupSummaryListResponse,
  Template,
  TemplateCreateRequest,
  Page,
  PageCreateRequest,
  SendingProfile,
  SendingProfileCreateRequest,
  Campaign,
  CampaignCreateRequest,
  CampaignResultsResponse,
  CampaignSummary,
  CampaignSummaryListResponse,
  GophishUser,
  UserCreateRequest,
} from "@/types/gophish";

export class GophishClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: GophishResponse<T> | T | null = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      if (!res.ok) throw new Error(`Gophish ${method} ${path}: ${res.status}`);
      return text as unknown as T;
    }
    if (!res.ok) {
      const msg = (parsed as GophishResponse<T>)?.message ?? text;
      throw new Error(`Gophish ${method} ${path}: ${res.status} ${msg}`);
    }
    if (parsed && typeof parsed === "object" && "success" in (parsed as object) && (parsed as GophishResponse<T>).success === false) {
      throw new Error((parsed as GophishResponse<T>).message || "Gophish request failed");
    }
    return ((parsed as GophishResponse<T>)?.data ?? parsed) as T;
  }

  // Groups
  getGroups(): Promise<Group[]> { return this.request<Group[]>("GET", "/groups/"); }
  getGroup(id: number): Promise<Group> { return this.request<Group>("GET", `/groups/${id}`); }
  createGroup(payload: GroupCreateRequest): Promise<Group> { return this.request<Group>("POST", "/groups/", payload); }
  updateGroup(id: number, payload: GroupCreateRequest): Promise<Group> { return this.request<Group>("PUT", `/groups/${id}`, payload); }
  deleteGroup(id: number): Promise<unknown> { return this.request("DELETE", `/groups/${id}`); }
  getGroupsSummary(): Promise<GroupSummaryListResponse> { return this.request<GroupSummaryListResponse>("GET", "/groups/summary"); }

  // Templates
  getTemplates(): Promise<Template[]> { return this.request<Template[]>("GET", "/templates/"); }
  getTemplate(id: number): Promise<Template> { return this.request<Template>("GET", `/templates/${id}`); }
  createTemplate(payload: TemplateCreateRequest): Promise<Template> { return this.request<Template>("POST", "/templates/", payload); }
  updateTemplate(id: number, payload: TemplateCreateRequest): Promise<Template> { return this.request<Template>("PUT", `/templates/${id}`, payload); }
  deleteTemplate(id: number): Promise<unknown> { return this.request("DELETE", `/templates/${id}`); }

  // Pages
  getPages(): Promise<Page[]> { return this.request<Page[]>("GET", "/pages/"); }
  getPage(id: number): Promise<Page> { return this.request<Page>("GET", `/pages/${id}`); }
  createPage(payload: PageCreateRequest): Promise<Page> { return this.request<Page>("POST", "/pages/", payload); }
  updatePage(id: number, payload: PageCreateRequest): Promise<Page> { return this.request<Page>("PUT", `/pages/${id}`, payload); }
  deletePage(id: number): Promise<unknown> { return this.request("DELETE", `/pages/${id}`); }

  // Sending profiles (SMTP)
  getSendingProfiles(): Promise<SendingProfile[]> { return this.request<SendingProfile[]>("GET", "/smtp/"); }
  getSendingProfile(id: number): Promise<SendingProfile> { return this.request<SendingProfile>("GET", `/smtp/${id}`); }
  createSendingProfile(payload: SendingProfileCreateRequest): Promise<SendingProfile> { return this.request<SendingProfile>("POST", "/smtp/", payload); }
  updateSendingProfile(id: number, payload: SendingProfileCreateRequest): Promise<SendingProfile> { return this.request<SendingProfile>("PUT", `/smtp/${id}`, payload); }
  deleteSendingProfile(id: number): Promise<unknown> { return this.request("DELETE", `/smtp/${id}`); }

  // Campaigns
  getCampaigns(): Promise<Campaign[]> { return this.request<Campaign[]>("GET", "/campaigns/"); }
  getCampaign(id: number): Promise<Campaign> { return this.request<Campaign>("GET", `/campaigns/${id}`); }
  createCampaign(payload: CampaignCreateRequest): Promise<Campaign> { return this.request<Campaign>("POST", "/campaigns/", payload); }
  deleteCampaign(id: number): Promise<unknown> { return this.request("DELETE", `/campaigns/${id}`); }
  completeCampaign(id: number): Promise<unknown> { return this.request("GET", `/campaigns/${id}/complete`); }
  getCampaignResults(id: number): Promise<CampaignResultsResponse> { return this.request<CampaignResultsResponse>("GET", `/campaigns/${id}/results`); }
  getCampaignSummary(id: number): Promise<CampaignSummary> { return this.request<CampaignSummary>("GET", `/campaigns/${id}/summary`); }
  getCampaignsSummary(): Promise<CampaignSummaryListResponse> { return this.request<CampaignSummaryListResponse>("GET", "/campaigns/summary"); }

  // Util
  sendTestEmail(payload: {
    template?: { name?: string };
    page?: { name?: string };
    smtp: { name?: string; host?: string; username?: string; password?: string; from_address?: string };
    url?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    position?: string;
  }): Promise<{ message: string; success: boolean }> {
    return this.request<{ message: string; success: boolean }>("POST", "/util/send_test_email", payload);
  }
  // Users (admin)
  createUser(payload: UserCreateRequest): Promise<GophishUser> { return this.request<GophishUser>("POST", "/users/", payload); }
}

export function createGophishClientFromEnv(): GophishClient {
  const url = process.env.GOPHISH_API_URL ?? process.env.GOPHISH_ADMIN_URL ?? "http://localhost:3333";
  const key = process.env.GOPHISH_API_KEY ?? process.env.GOPHISH_ADMIN_API_KEY ?? "";
  return new GophishClient(url, key);
}