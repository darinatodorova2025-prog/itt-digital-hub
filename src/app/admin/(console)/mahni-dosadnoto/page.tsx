import "@/mahni-dosadnoto/styles.css";
import { MahniAdminDashboard } from "@/mahni-dosadnoto/MahniAdminDashboard";
import { mdAdminSnapshot } from "./actions";

export default async function MahniAdminPage() {
  const snapshot = await mdAdminSnapshot();
  return <MahniAdminDashboard initial={snapshot} />;
}
