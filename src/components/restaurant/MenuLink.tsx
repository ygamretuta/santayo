import { findMenu } from "@/lib/menu";
import { MenuDialog } from "./MenuDialog";

/** Looks for a menu on the restaurant's website; renders nothing if there isn't one. */
export async function MenuLink({ website, name }: { website?: string; name: string }) {
  const menu = await findMenu(website);
  return menu ? <MenuDialog menu={menu} name={name} /> : null;
}
