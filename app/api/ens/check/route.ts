import { errorResponse, json, rateLimit, SintingaleError } from "@/lib/api";
import { requireTeams } from "@/lib/features";
import { verifyControl } from "@/lib/ens/ownership";
import { getAvatar } from "@/lib/ens/resolve";

/** Does `address` control the records of `name` on Sepolia ENS? Used before linking an org. */
export async function GET(request: Request) {
  try {
    await requireTeams();
    rateLimit(request, "ens-check", 30);
    const params = new URL(request.url).searchParams;
    const name = params.get("name") ?? "";
    const address = params.get("address") ?? "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new SintingaleError("BAD_REQUEST", "address is required.");
    const [control, avatar] = await Promise.all([verifyControl(name, address, { fresh: true }), getAvatar(name)]);
    return json({ ...control, avatar });
  } catch (err) {
    return errorResponse(err);
  }
}
