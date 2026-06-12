import { redirect } from "next/navigation";

export default function AuthRegisterRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  const callbackUrl = searchParams.callbackUrl;
  const redirectUrl = searchParams.redirect;
  const inviteCode = searchParams.inviteCode;
  if (typeof callbackUrl === "string" && callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  }
  if (typeof redirectUrl === "string" && redirectUrl) {
    params.set("redirect", redirectUrl);
  }
  if (typeof inviteCode === "string" && inviteCode) {
    params.set("inviteCode", inviteCode);
  }
  const suffix = params.toString();
  redirect(suffix ? `/login?${suffix}` : "/login");
}
