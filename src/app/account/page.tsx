import { redirect } from "next/navigation";

export default async function AccountPage() {
  redirect("/workspace/settings");
}
