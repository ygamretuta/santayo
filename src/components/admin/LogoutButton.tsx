"use client";

import { useRouter } from "next/navigation";
import "./admin-bar.css";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="admin-bar__logout"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
