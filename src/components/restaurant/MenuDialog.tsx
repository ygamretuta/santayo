"use client";

import { useId, useRef, useState } from "react";
import type { Menu } from "@/lib/types";
import "./menu-dialog.css";

/** "View menu" button that opens the menu in a modal dialog. */
export function MenuDialog({ menu, name }: { menu: Menu; name: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className="button button--secondary"
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
      >
        📖 View menu
      </button>

      <dialog
        ref={ref}
        className="menu-dialog"
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        // The dialog fills its own box, so a click on the backdrop targets the dialog itself.
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <header className="menu-dialog__header">
          <h2 id={titleId} className="menu-dialog__title">
            Menu · {name}
          </h2>
          <a href={menu.url} target="_blank" rel="noopener noreferrer" className="menu-dialog__external">
            Open in new tab ↗
          </a>
          <button
            type="button"
            className="menu-dialog__close"
            aria-label="Close menu"
            onClick={() => ref.current?.close()}
          >
            ✕
          </button>
        </header>

        {/* Mounted only while open so the menu isn't loaded until asked for. */}
        {open && (
          <div className="menu-dialog__body">
            {menu.kind === "image" ? (
              <div className="menu-dialog__scroll">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party host */}
                <img src={menu.url} alt={`${name} menu`} className="menu-dialog__image" referrerPolicy="no-referrer" />
              </div>
            ) : menu.embeddable ? (
              <iframe
                src={menu.url}
                title={`${name} menu`}
                className="menu-dialog__frame"
                referrerPolicy="no-referrer"
                // Chrome's PDF viewer doesn't run in sandboxed frames; web pages stay sandboxed.
                {...(menu.kind === "page" ? { sandbox: "allow-scripts allow-same-origin allow-popups allow-forms" } : {})}
              />
            ) : (
              <div className="menu-dialog__fallback">
                <p>This restaurant’s menu can’t be shown here.</p>
                <a href={menu.url} target="_blank" rel="noopener noreferrer" className="button">
                  Open menu ↗
                </a>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
