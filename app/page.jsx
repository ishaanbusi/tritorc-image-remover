import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Home() {
  const auth = cookies().get("tritorc_auth");
  if (auth?.value === "1") {
    redirect("/optimizer");
  } else {
    redirect("/login");
  }
}
