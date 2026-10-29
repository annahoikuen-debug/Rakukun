import { prisma } from "./prisma";

// Reconcile Gophish results with TrainingResult rows by email, setting gophishResultId.
// Called after launch and on-demand (campaign detail page / a scheduled job) so that
// scheduled campaigns (which have no results at launch time) still get mapped.
export async function syncTrainingResults(tenantId: string, trainingCampaignId: string, gophishCampaignId: number, client: any): Promise<number> {
  let mapped = 0;
  let cres: any;
  try {
    cres = await client.getCampaignResults(gophishCampaignId);
  } catch (e) {
    console.error("syncTrainingResults: gophish fetch failed", e);
    return 0;
  }
  const results = (cres?.results ?? []) as any[];
  if (!results.length) return 0;

  const employees = await prisma.targetEmployee.findMany({ where: { tenantId } });
  const byEmail = new Map(employees.map((e) => [e.email.toLowerCase(), e]));

  for (const r of results) {
    const emp = byEmail.get(String(r.email).toLowerCase());
    if (!emp) continue;
    try {
      const upd = await prisma.trainingResult.updateMany({
        where: { trainingCampaignId, targetEmployeeId: emp.id },
        data: { gophishResultId: String(r.id), emailSentAt: r.send_date ? new Date(r.send_date) : undefined },
      });
      mapped += upd.count;
    } catch {
      // unique conflict (already mapped to another row) — skip
    }
  }
  return mapped;
}