import { Logo } from "../ui/Logo";
import { SiteHeader } from "../ui/SiteHeader";
import { LogoutButton } from "./LogoutButton";
import "./admin-bar.css";

export function AdminBar({ signedIn }: { signedIn: boolean }) {
  return (
    <SiteHeader>
      <div className="admin-bar">
        <div className="admin-bar__brand">
          <Logo />
          <span className="admin-bar__badge">Admin</span>
        </div>
        {signedIn && <LogoutButton />}
      </div>
    </SiteHeader>
  );
}
