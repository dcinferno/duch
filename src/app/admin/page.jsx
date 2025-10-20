import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import AdminUI from "./AdminUI";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user.isAdmin) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <AdminUI />
    </div>
  );
}
