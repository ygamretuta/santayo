import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { LoginForm } from "@/components/admin/LoginForm";
import { Status } from "@/components/ui/Status";
import { adminConfigured, isAdmin } from "@/lib/admin/auth";
import "../admin.css";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<Status>Loading…</Status>}>
      <Login />
    </Suspense>
  );
}

async function Login() {
  if (await isAdmin()) redirect("/admin");
  return (
    <>
      <AdminBar signedIn={false} />
      <main className="page page--empty">
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="admin__message">
            The admin isn&rsquo;t configured. Set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> (32+
            characters) in the environment.
          </p>
        )}
      </main>
    </>
  );
}
