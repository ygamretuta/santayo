import { connection } from "next/server";
import { findMenu } from "@/lib/menu";
import { MenuDialog } from "./MenuDialog";

/** Looks for a menu on the restaurant's website; renders nothing if there isn't one. */
export async function MenuLink({ website, name }: { website?: string; name: string }) {
  // The lookup talks to a third-party site and uses timers, so render it at request time.
  await connection();
  const menu = await findMenu(website);
  return menu ? <MenuDialog menu={menu} name={name} /> : null;
}
