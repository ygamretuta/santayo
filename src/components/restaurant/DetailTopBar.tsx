import { BackButton } from "../ui/BackButton";
import { Logo } from "../ui/Logo";
import "./detail-topbar.css";

/** Logo (home link) and a back button above the restaurant details. */
export function DetailTopBar() {
  return (
    <header className="detail-topbar">
      <Logo />
      <BackButton />
    </header>
  );
}
