"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX, IconChevronDown } from "@tabler/icons-react";

/* -----------------------------
   Types & Context
------------------------------ */

export interface LinkItem {
  label: string;
  href?: string;                // optional when it's a parent group
  icon?: React.JSX.Element | React.ReactNode;
  children?: LinkItem[];        // nested items
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

/* -----------------------------
   Provider + Root
------------------------------ */

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = setOpenProp ?? setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

/* -----------------------------
   Layout shells
------------------------------ */

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] shrink-0",
        className
      )}
      animate={{ width: animate ? (open ? "300px" : "60px") : "300px" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
      )}
      {...props}
    >
      <div className="flex justify-end z-20 w-full">
        <IconMenu2
          className="text-neutral-800 dark:text-neutral-200"
          onClick={() => setOpen(!open)}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <button
              className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
              onClick={() => setOpen(false)}
              aria-label="Close sidebar"
            >
              <IconX />
            </button>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* -----------------------------
   Link / Group item
------------------------------ */

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: LinkItem;
  className?: string;
}) => {
  const { open, animate } = useSidebar();

  // If the item has children, render as a collapsible group
  if (link.children && link.children.length > 0) {
    return <SidebarGroup link={link} className={className} {...props} />;
  }

  // Plain link
  return (
    <a
      href={link.href || "#"}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 px-2",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block"
      >
        {link.label}
      </motion.span>
    </a>
  );
};

/* Collapsible group for nested items */
const SidebarGroup = ({
  link,
  className,
  ...props
}: {
  link: LinkItem;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  const [expanded, setExpanded] = useState(true); // default expanded when sidebar is open

  const showText = !animate || open;

  return (
    <div className={cn("w-full", className)} {...props}>
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className={cn(
          "w-full flex items-center justify-between gap-2 py-2 rounded-md px-2 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
        )}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {link.icon}
          <motion.span
            animate={{
              display: showText ? "inline-block" : "none",
              opacity: showText ? 1 : 0,
            }}
            className="text-neutral-700 dark:text-neutral-200 text-sm whitespace-pre inline-block"
          >
            {link.label}
          </motion.span>
        </div>

        {/* Chevron only when text is visible (i.e., sidebar open) */}
        {showText && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-neutral-500 dark:text-neutral-300"
          >
            <IconChevronDown className="h-4 w-4" />
          </motion.span>
        )}
      </button>

      {/* Children list with height animation */}
      <AnimatePresence initial={false}>
        {expanded && showText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pl-8"
          >
            {link.children!.map((child, idx) => (
              <a
                key={`${link.label}-child-${idx}`}
                href={child.href || "#"}
                className="flex items-center gap-2 py-2 px-2 rounded-md text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
              >
                {/* Optional child icons */}
                {child.icon}
                <span>{child.label}</span>
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
