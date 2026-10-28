// TypeScript type definitions mirroring Gophish REST API models.
// Source: controllers/api/* and models/* of the gophish backend.

export interface GophishResponse<T = unknown> {
  message: string;
  success: boolean;
  data?: T;
}

export interface BaseRecipient {
  email: string;
  first_name: string;
  last_name: string;
  position: string;
}

export interface Target extends BaseRecipient {
  id?: number;
}

export interface GroupSummary {
  id: number;
  name: string;
  modified_date: string;
  num_targets: number;
}

export interface GroupSummaryListResponse {
  total: number;
  groups: GroupSummary[];
}

export interface Group {
  id: number;
  name: string;
  modified_date: string;
  targets: BaseRecipient[];
}

export interface GroupCreateRequest {
  name: string;
  targets: BaseRecipient[];
}

export interface Attachment {
  content: string;
  type: string;
  name: string;
}

export interface Template {
  id: number;
  name: string;
  envelope_sender: string;
  subject: string;
  text: string;
  html: string;
  modified_date: string;
  attachments: Attachment[];
}

export interface TemplateCreateRequest {
  name: string;
  subject: string;
  text?: string;
  html: string;
  envelope_sender?: string;
  attachments?: Attachment[];
}

export interface Page {
  id: number;
  name: string;
  html: string;
  capture_credentials: boolean;
  capture_passwords: boolean;
  redirect_url: string;
  modified_date: string;
}

export interface PageCreateRequest {
  name: string;
  html: string;
  capture_credentials?: boolean;
  capture_passwords?: boolean;
  redirect_url?: string;
}

export interface Header {
  key: string;
  value: string;
}

export interface SendingProfile {
  id: number;
  interface_type: string;
  name: string;
  host: string;
  username?: string;
  password?: string;
  from_address: string;
  ignore_cert_errors: boolean;
  headers: Header[];
  modified_date: string;
}

export interface SendingProfileCreateRequest {
  name: string;
  host: string;
  interface_type?: string;
  username?: string;
  password?: string;
  from_address: string;
  ignore_cert_errors?: boolean;
  headers?: Header[];
}

export interface Event {
  campaign_id: number;
  email: string;
  time: string;
  message: string;
  details: string;
}

export interface Result extends BaseRecipient {
  id: string; // RId
  status: string;
  ip: string;
  latitude: number;
  longitude: number;
  send_date: string;
  reported: boolean;
  modified_date: string;
}

export interface Campaign {
  id: number;
  name: string;
  created_date: string;
  launch_date: string;
  send_by_date: string;
  completed_date: string;
  template: Template;
  page: Page;
  status: string;
  results?: Result[];
  groups?: Group[];
  timeline?: Event[];
  smtp: SendingProfile;
  url: string;
}

export interface CampaignResultsResponse {
  id: number;
  name: string;
  status: string;
  results: Result[];
  timeline: Event[];
}

export interface CampaignStats {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  submitted_data: number;
  email_reported: number;
  error: number;
}

export interface CampaignSummary {
  id: number;
  created_date: string;
  launch_date: string;
  send_by_date: string;
  completed_date: string;
  status: string;
  name: string;
  stats: CampaignStats;
}

export interface CampaignSummaryListResponse {
  total: number;
  campaigns: CampaignSummary[];
}

export interface CampaignCreateRequest {
  name: string;
  template: { name: string };
  page: { name: string };
  smtp: { name: string };
  groups: { name: string }[];
  url: string;
  launch_date?: string;
  send_by_date?: string;
}

export interface Role {
  slug: string;
  name: string;
  description: string;
}

export interface GophishUser {
  id: number;
  username: string;
  api_key: string;
  role: Role;
  password_change_required: boolean;
  account_locked: boolean;
  last_login: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
  password_change_required?: boolean;
  account_locked?: boolean;
}