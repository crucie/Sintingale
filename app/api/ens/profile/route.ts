import { errorResponse, json, rateLimit, SintingaleError } from "@/lib/api";
import { requireTeams } from "@/lib/features";
import { getProfile } from "@/lib/ens/resolve";

export async function GET(request: Request) {
  try {
    await requireTeams();
    rateLimit(request, "ens-profile", 60);
    const name = new URL(request.url).searchParams.get("name");
    if (!name) throw new SintingaleError("BAD_REQUEST", "name is required.");
    return json(await getProfile(name));
  } catch (err) {
    return errorResponse(err);
  }
}
