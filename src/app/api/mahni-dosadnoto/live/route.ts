import { getMahniStore } from "@/mahni-dosadnoto/store";
import { handleStoreError, jsonOk } from "@/mahni-dosadnoto/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = getMahniStore();
    const snapshot = await store.getPublicLiveSnapshot();
    return jsonOk({ snapshot });
  } catch (error) {
    return handleStoreError(error);
  }
}
