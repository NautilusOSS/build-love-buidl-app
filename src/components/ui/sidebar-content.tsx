
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SidebarContent component.
 * Applies a flashy gradient/glass background when not at the top of the scroll.
 */
const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  // Track if the scroll is at the very top
  const [isAtTop, setIsAtTop] = React.useState(true);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // Forward ref usage
  React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);

  React.useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const handleScroll = () => {
      setIsAtTop(node.scrollTop === 0);
    };

    node.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check in case of default scroll offset
    handleScroll();

    return () => {
      node.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // The flashy background is applied to the menu area, except when at top
  return (
    <div
      ref={contentRef}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden transition-colors duration-300",
        isAtTop ? "bg-transparent" : "sidebar-flashy-bg",
        className
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

export { SidebarContent };
