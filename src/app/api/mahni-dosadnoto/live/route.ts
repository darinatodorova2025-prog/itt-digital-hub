import { getMahniStore } from "@/mahni-dosadnoto/store";
import { jsonOk } from "@/mahni-dosadnoto/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getMahniStore();
  const snapshot = await store.getPublicLiveSnapshot();
  return jsonOk({ snapshot });
}
