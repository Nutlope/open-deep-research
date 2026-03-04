import React, { useEffect, useState } from "react";
import { cn, extractMarkdownHeadings, generateAnchorId } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const TableOfContents = ({ markdown }: { markdown: string }) => {
  const headings = extractMarkdownHeadings(markdown).filter(
    (h) => h.level === 2
  );

  const [currentHash, setCurrentHash] = useState<string>("");

  useEffect(() => {
    // Function to update currentHash based on scroll position
    const handleScroll = () => {
      const OFFSET = 80;
      const headingAnchors = headings.map((heading) => {
        const anchor = generateAnchorId(heading.text);
        return {
          id: anchor,
          el: document.getElementById(anchor),
        };
      });
      // Filter out headings that don't exist in DOM
      const visibleHeadings = headingAnchors.filter((h) => h.el);
      // Find the heading closest to the top (with offset)
      let closest = visibleHeadings[0];
      for (const h of visibleHeadings) {
        const rect = h.el!.getBoundingClientRect();
        if (rect.top - OFFSET <= 0) {
          closest = h;
        } else {
          break;
        }
      }
      if (closest) {
        setCurrentHash(`#${closest.id}`);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial call
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [markdown]);

  if (headings.length === 0) return null;

  return (
    <div className="hidden xl:block w-full max-w-xs xl:max-w-[220px] mb-6 xl:mb-0 xl:mr-6 sticky top-6 max-h-[calc(100vh-48px)] overflow-auto border-l border-[#E2E8F0]">
      <ul className="space-y-1">
        {headings.map((heading, idx) => {
          const anchor = generateAnchorId(heading.text);
          const isActive = currentHash === `#${anchor}`;
          return (
            <motion.li
              key={idx}
              layout
              className={cn(
                "border-l-2 ml-[-1px] border-transparent relative z-10 bg-white"
              )}
              initial={false}
              animate={
                isActive
                  ? { backgroundColor: "#fff" }
                  : { backgroundColor: "#fff" }
              }
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {isActive && (
                <motion.div
                  layoutId="toc-active-border"
                  className="absolute left-[-1px] top-0 h-full w-0.5 bg-[#0f172b] rounded"
                  style={{ zIndex: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <a
                href={`#${anchor}`}
                className={cn(
                  "block pl-3 transition-colors duration-300",
                  isActive
                    ? "text-sm font-medium text-left text-[#0f172b]"
                    : "text-sm font-light text-left text-[#62748e]"
                )}
              >
                {heading.text}
              </a>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
};
