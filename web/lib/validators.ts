import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  name: z.string().min(1).optional(),
  orgName: z.string().min(1),
});

export const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  text: z.string().optional().default(""),
  html: z.string().min(1),
  envelope_sender: z.string().optional(),
});

export const pageSchema = z.object({
  name: z.string().min(1),
  html: z.string().min(1),
  redirect_url: z.string().optional().default(""),
});

export const targetSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional().default(""),
  last_name: z.string().optional().default(""),
  position: z.string().optional().default(""),
});

export const groupSchema = z.object({
  name: z.string().min(1),
  // Upper bound guards against oversized payload memory exhaustion (zod DoS).
  targets: z.array(targetSchema).min(1).max(5000),
});

export const smtpSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  username: z.string().optional().default(""),
  password: z.string().optional().default(""),
  from_address: z.string().email(),
  ignore_cert_errors: z.boolean().optional().default(false),
});

export const campaignSchema = z.object({
  name: z.string().min(1),
  templateName: z.string().min(1),
  pageName: z.string().min(1),
  smtpName: z.string().min(1),
  groupNames: z.array(z.string().min(1)).min(1).max(50),
  url: z.string().url(),
  launch_date: z.string().optional(),
  send_by_date: z.string().optional(),
});