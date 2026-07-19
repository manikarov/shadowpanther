import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

export interface NavItem {
  path: string;
  label: string;
}

/** A dropdown for one nav group. Opens on click (not hover) so it works on
 *  touch, closes on outside click, on Escape, and whenever the route changes. */
export function NavMenu({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // A navigation inside the menu should leave it closed behind us.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Mark the trigger when the page we are on lives inside this group.
  const active = items.some((item) => pathname === `/${item.path}`);

  return (
    <div className="nav-menu" ref={wrapper}>
      <button
        type="button"
        className="nav-menu-trigger"
        ref={trigger}
        aria-haspopup="true"
        aria-expanded={open}
        data-active={active || undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        {label}
        <span className="nav-menu-caret" aria-hidden="true" />
      </button>
      {open && (
        <div className="nav-menu-list">
          {items.map((item) => (
            <NavLink key={item.path} to={`/${item.path}`}>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
