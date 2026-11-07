import "server-only";
import { SintingaleError } from "./api";
import { publicConfig } from "./config";
import { getLedger } from "./ledger";

/**
 * ENS teams, revenue splits and agents are an opt-in layer. Off by default:
 * the core product (products, invoices, checkout, receipts) never depends on
 * it, and checkout makes no ENS lookups while it is off.
 */
export async function teamsEnabled(merchantId: string = publicConfig.merchantId): Promise<boolean> {
  const [merchant] = await getLedger().query("merchant", { eq: { merchantId }, limit: 1 });
  return merchant?.attrs.teamsEnabled === true;
}

export async function requireTeams(merchantId?: string) {
  if (!(await teamsEnabled(merchantId))) {
    throw new SintingaleError(
      "FEATURE_DISABLED",
      "Teams & ENS are turned off. Enable them in Dashboard → Settings to use organisations, projects and agents.",
    );
  }
}
