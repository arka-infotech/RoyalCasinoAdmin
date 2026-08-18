"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSidebarSections } from "@/config/sidebar";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useMemo, useRef, useState } from "react";

interface SidebarProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  desktopOpen: boolean;
  onToggleDesktop: () => void;
}

type IconProps = { className?: string };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Admin";

function IconDashboard({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2 20 6.5v11L12 22 4 17.5v-11L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 6.5 12 11l8-4.5M12 11v11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4 21a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWallet({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 7.5h13.25a2.75 2.75 0 0 1 2.75 2.75v7a2.75 2.75 0 0 1-2.75 2.75H6.75A2.75 2.75 0 0 1 4 19.25V8.75A1.25 1.25 0 0 1 5.25 7.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 7.5V6.5A2.5 2.5 0 0 1 7 4h10.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16.75 13.5h3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconArrowIn({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5v8A2.5 2.5 0 0 0 6.5 20H10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M20 12H9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13 8l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCloud({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.5 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 11.4 3.5 3.5 0 0 0 7.5 18Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 19V5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 19h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 15l3-3 3 2 5-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconReceipt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6M9 16h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDownload({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 10.5 12 13.9l3.5-3.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevronDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconForHref({ href, className }: { href: string; className: string }) {
  const iconClass = className;

  if (href === "/dashboard") return <IconDashboard className={iconClass} />;
  if (href.startsWith("/management/")) {
    if (href.includes("users-wallet")) return <IconWallet className={iconClass} />;
    if (href.includes("online-players")) return <IconArrowIn className={iconClass} />;
    return <IconUser className={iconClass} />;
  }
  if (href.startsWith("/game/")) return <IconCloud className={iconClass} />;
  if (href.startsWith("/reports/")) return <IconReceipt className={iconClass} />;
  if (href.startsWith("/logs-activity/")) return <IconChart className={iconClass} />;

  return <IconReceipt className={iconClass} />;
}

export default function Sidebar({
  open,
  onOpen,
  onClose,
  desktopOpen,
  onToggleDesktop,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const sections = getSidebarSections(user?.role ?? 'admin');
  const [liveResultOpen, setLiveResultOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [suppressHoverExpand, setSuppressHoverExpand] = useState(false);
  const prevDesktopOpen = useRef(desktopOpen);

  const liveResultActive = pathname.startsWith("/live-reports/live-result");

  useEffect(() => {
    // Prevent background scroll when mobile menu is open.
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia?.("(max-width: 767px)")?.matches ?? false;
    if (!isMobile) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prevOverflow || "";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (liveResultActive) setLiveResultOpen(true);
  }, [liveResultActive]);

  useEffect(() => {
    // If the user "closes" the desktop sidebar while the mouse is still over it
    // (toggle button is inside sidebar), hover would immediately re-expand it.
    // Suppress hover-expand until the mouse leaves the sidebar once.
    if (prevDesktopOpen.current && !desktopOpen) setSuppressHoverExpand(true);
    if (desktopOpen) setSuppressHoverExpand(false);
    prevDesktopOpen.current = desktopOpen;
  }, [desktopOpen]);

  const liveReportsSection = useMemo(
    () => sections.find((s) => s.title === "LIVE REPORTS"),
    [sections]
  );
  const otherSections = useMemo(
    () => sections.filter((s) => s.title !== "LIVE REPORTS"),
    [sections]
  );

  const shellBg = "bg-indigo-950 text-white";
  const isExpanded = desktopOpen || (!suppressHoverExpand && isHovered);

  const itemBase =
    "relative flex items-center px-4 text-[13px] leading-5 text-zinc-300 transition-colors md:gap-1.5 md:px-5 md:py-1.5 md:text-[14px]";
  const itemHover = "hover:text-zinc-100";
  const activeText = "text-[#5B73FF]";
  const activeBar =
    "before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-r before:bg-[#5B73FF]";

  function NavItem({
    title,
    href,
    onClick,
    expanded,
    className,
  }: {
    title: string;
    href: string;
    onClick?: () => void;
    expanded?: boolean;
    className?: string;
  }) {
    const isNavExpanded = expanded ?? isExpanded;
    const isActive = pathname === href || pathname.startsWith(href + "/");

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (href === "/reports/turnover-report" && pathname === "/reports/turnover-report") {
        e.preventDefault();
        router.push("/reports/turnover-report");
      }
      onClick?.();
    };

    return (
      <Link
        href={href}
        onClick={handleClick}
        className={[
          itemBase,
          itemHover,
          className ?? "",
          isActive ? `${activeText} ${activeBar}` : "",
        ].join(" ")}
      >
        <span className="shrink-0 w-8 flex justify-center">
          <IconForHref
            href={href}
            className={["h-4.75 w-4.75", "text-current opacity-85"].join(
              " "
            )}
          />
        </span>
        <span
          className={[
            "min-w-0 flex-1 truncate whitespace-nowrap",
            "transition-all duration-300",
            isNavExpanded
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 pointer-events-none",
          ].join(" ")}
        >
          {title}
        </span>
      </Link>
    );
  }

  function SectionTitle({
    title,
    expanded,
  }: {
    title: string;
    expanded: boolean;
  }) {
    return (
      <div
        className={[
          "flex items-center pt-2 pb-1 px-4 md:gap-1.5 md:pt-3 md:pb-2.5 md:px-5",
          "text-[13px] md:text-[12px] font-semibold tracking-[0.18em] text-white",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="shrink-0 w-8 flex justify-center"
        >
          <span className="h-2 w-2 rounded-full bg-indigo-300/80" />
        </span>
        <span
          className={[
            "min-w-0 flex-1 whitespace-nowrap",
            "transition-all duration-300",
            expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none",
          ].join(" ")}
        >
          {title}
        </span>
      </div>
    );
  }

  return (
    <>
      <aside
        className={[
          "hidden md:block fixed top-0 left-0 z-40 h-screen",
          shellBg,
          "overflow-y-auto hide-scrollbar",
          "overflow-x-hidden",
          "transition-[width] duration-200 ease-out",
          isExpanded ? "w-72" : "w-16",
        ].join(" ")}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setSuppressHoverExpand(false);
        }}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-indigo-950">
          <div
            className={[
              "flex items-center justify-between",
              isExpanded ? "h-18 px-5" : "h-18 px-3",
            ].join(" ")}
          >
            <div
              className={[
                "text-[22px] font-medium tracking-wide text-[#5B73FF] whitespace-nowrap",
                isExpanded ? "block" : "hidden",
              ].join(" ")}
            >
              
            </div>
            <button
              type="button"
              aria-label="Menu"
              onClick={onToggleDesktop}
              className="rounded-md p-2 text-slate-200 hover:bg-white/5 hover:text-white"
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
            </button>
          </div>
        </div>

        <nav className="pb-8">
          {otherSections.map((section) => (
            <div key={section.title}>
              {section.title === "LOGS ACTIVITY" && liveReportsSection && (
                <div>
                  <SectionTitle title={liveReportsSection.title} expanded={isExpanded} />

                  <button
                    type="button"
                    onClick={() => setLiveResultOpen((v) => !v)}
                    className={[
                      itemBase,
                      itemHover,
                      liveResultActive ? `${activeText} ${activeBar}` : "",
                      "w-full text-left",
                    ].join(" ")}
                  >
                    <span className="shrink-0 w-8 flex justify-center">
                      <IconDownload className="h-4.5 w-4.5 text-current opacity-85" />
                    </span>
                    <span
                      className={[
                        "flex-1 truncate whitespace-nowrap",
                        "transition-all duration-300",
                        isExpanded
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-4 pointer-events-none",
                      ].join(" ")}
                    >
                      Live Result
                    </span>
                    <span
                      className={[
                        "shrink-0 transition-transform",
                        liveResultOpen ? "rotate-180" : "rotate-0",
                        liveResultActive ? "text-[#5B73FF]" : "text-current opacity-80",
                        "transition-all duration-300",
                        isExpanded ? "opacity-100" : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <IconChevronDown className="h-2.5 w-2.5" />
                    </span>
                  </button>

                  {liveResultOpen && (
                    <div className="mt-1 space-y-1 pb-1">
                      {liveReportsSection.items.map((item) => (
                        <div
                          key={item.href}
                          className={[
                            "pl-6",
                            isExpanded ? "block" : "hidden",
                          ].join(" ")}
                        >
                          <NavItem
                            title={item.title}
                            href={item.href}
                            expanded={isExpanded}
                            className="text-[15px] md:text-[16px] text-zinc-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <SectionTitle title={section.title} expanded={isExpanded} />
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem
                    key={item.href}
                    title={item.title}
                    href={item.href}
                    expanded={isExpanded}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <aside
        className={[
          "md:hidden fixed inset-y-0 left-0 z-50 w-72",
          shellBg,
          "hide-scrollbar",
          "overflow-x-hidden",
          "transition-transform duration-200 ease-out",
          "overflow-y-auto",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-indigo-950">
          <div
            className={[
              "flex items-center justify-between",
              "h-18 px-5",
            ].join(" ")}
          >
            <div
              className={[
                "text-[22px] font-medium tracking-wide text-[#5B73FF] whitespace-nowrap",
                "block",
              ].join(" ")}
            >
              {APP_NAME}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-slate-200 hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <span className="block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 bg-current" />
            </button>
          </div>
        </div>

        <nav className="pb-8">
          {otherSections.map((section) => (
            <div key={section.title}>
              {section.title === "LOGS ACTIVITY" && liveReportsSection && (
                <div>
                  <SectionTitle title={liveReportsSection.title} expanded={open} />

                  <button
                    type="button"
                    onClick={() => setLiveResultOpen((v) => !v)}
                    className={[
                      itemBase,
                      itemHover,
                      liveResultActive ? `${activeText} ${activeBar}` : "",
                      "w-full text-left",
                    ].join(" ")}
                  >
                    <span className="shrink-0 w-8 flex justify-center">
                      <IconDownload className="h-4.5 w-4.5 text-current opacity-85" />
                    </span>
                    <span
                      className={[
                        "flex-1 truncate whitespace-nowrap",
                        "transition-all duration-300",
                        open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none",
                      ].join(" ")}
                    >
                      Live Result
                    </span>
                    <span
                      className={[
                        "shrink-0 transition-transform",
                        liveResultOpen ? "rotate-180" : "rotate-0",
                        liveResultActive ? "text-[#5B73FF]" : "text-current opacity-80",
                        "transition-all duration-300",
                        open ? "opacity-100" : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <IconChevronDown className="h-5 w-5" />
                    </span>
                  </button>

                  {liveResultOpen && (
                    <div className="mt-1 space-y-1 pb-1">
                      {liveReportsSection.items.map((item) => (
                        <div key={item.href} className="pl-6">
                          <NavItem
                            title={item.title}
                            href={item.href}
                            onClick={onClose}
                            expanded={open}
                            className="text-[15px] md:text-[16px] text-zinc-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <SectionTitle title={section.title} expanded={open} />
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem
                    key={item.href}
                    title={item.title}
                    href={item.href}
                    onClick={onClose}
                    expanded={open}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {open && (
        <button
          aria-label="Sidebar overlay"
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}
    </>
  );
}
