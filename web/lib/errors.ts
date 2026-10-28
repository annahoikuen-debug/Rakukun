export class OrgAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "OrgAccessError";
    this.status = status;
  }
}

export function toOrgErrorStatus(err: unknown): number {
  return err instanceof OrgAccessError ? err.status : 500;
}