import React from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import Link from "next/link";
import { FaviconImage } from "./FaviconImage";
import { CitationTooltip } from "./app/citations/CitationTooltip";
import { cleanMarkdownBold, generateAnchorId } from "@/lib/utils";
import "streamdown/styles.css";

interface CustomMarkdownProps {
  children: string;
  sources?: Array<{ url: string; title: string }>;
  isStreaming?: boolean;
}

const getHeadingText = (children: React.ReactNode): string => {
  const textContent = React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string") {
        return child;
      } else if (React.isValidElement(child)) {
        // @ts-expect-error - accessing props of React element
        return child.props.children || "";
      }
      return "";
    })
    .join("");

  return cleanMarkdownBold(textContent);
};

export const CustomMarkdown: React.FC<CustomMarkdownProps> = ({
  children,
  sources,
  isStreaming = false,
}) => {
  const processContent = (content: string): string => {
    if (!sources) return content;

    return content.replace(
      /\[INLINE_CITATION\]\(([^)]+)\)/g,
      (match, url) => {
        const normalizedHref = url.replace(/\/+$/, "");
        const sourceIndex = sources.findIndex(
          (source) => source.url.replace(/\/+$/, "") === normalizedHref
        );
        if (sourceIndex !== -1) {
          return `[${sourceIndex + 1}](${url})`;
        }
        return match;
      }
    );
  };

  const processedContent = processContent(children);

  return (
    <div className="custom-markdown">
      <Streamdown
        animated
        plugins={{ code }}
        isAnimating={isStreaming}
        components={{
          p: ({ children }) => (
            <p className="text-base font-light text-left text-[#0f172b] leading-7 mb-3">
              {children}
            </p>
          ),
          hr: () => <hr className="my-4 border-border" />,
          pre: ({ children }) => <>{children}</>,
          img: (props) => {
            return <img className="max-w-full rounded-lg my-4" {...props} />;
          },
          ol: ({ children, ...props }) => {
            return (
              <ol className="list-decimal list-outside ml-4 my-2" {...props}>
                {children}
              </ol>
            );
          },
          li: ({ children, ...props }) => {
            return (
              <li className="py-0.5 leading-7" {...props}>
                {children}
              </li>
            );
          },
          ul: ({ children, ...props }) => {
            return (
              <ul className="list-disc list-outside ml-4 my-2" {...props}>
                {children}
              </ul>
            );
          },
          strong: ({ children, ...props }) => {
            return (
              <span className="font-semibold" {...props}>
                {children}
              </span>
            );
          },
          a: ({ children, ...props }) => {
            const href = props.href || "";

            if (sources && /^\d+$/.test(children?.toString() || "")) {
              const sourceIndex = parseInt(children?.toString() || "0", 10) - 1;
              if (sourceIndex >= 0 && sourceIndex < sources.length) {
                return (
                  <CitationTooltip
                    index={sourceIndex}
                    source={sources[sourceIndex]}
                  />
                );
              }
            }

            return (
              <Link
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noreferrer"
                href={href}
              >
                {children}
              </Link>
            );
          },
          h1: ({ children, ...props }) => {
            const anchor = generateAnchorId(getHeadingText(children));
            return (
              <h1
                id={anchor}
                className="text-[28px] md:text-[40px] font-medium text-left text-[#0f172b] mb-2 mt-4 leading-[48px]"
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const anchor = generateAnchorId(getHeadingText(children));
            return (
              <h2
                id={anchor}
                className="text-2xl md:text-[28px] text-left font-medium text-[#0f172b] mb-2 mt-4"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const anchor = generateAnchorId(getHeadingText(children));
            return (
              <h3
                id={anchor}
                className="text-[18px] md:text-xl text-left text-[#0f172b] mb-1.5 mt-3"
                {...props}
              >
                {children}
              </h3>
            );
          },
          h4: ({ children, ...props }) => {
            return (
              <h4 className="text-lg text-left text-[#0f172b] mb-1.5 mt-3" {...props}>
                {children}
              </h4>
            );
          },
          h5: ({ children, ...props }) => {
            return (
              <h5 className="text-base text-left text-[#0f172b] mb-1 mt-2" {...props}>
                {children}
              </h5>
            );
          },
          h6: ({ children, ...props }) => {
            return (
              <h6 className="text-sm text-left text-[#0f172b] mb-1 mt-2" {...props}>
                {children}
              </h6>
            );
          },
          table: ({ children, ...props }) => {
            return (
              <div className="w-full overflow-auto my-4">
                <table
                  className="w-full text-sm text-left border-collapse rounded-lg overflow-hidden"
                  {...props}
                >
                  {children}
                </table>
              </div>
            );
          },
          thead: ({ children, ...props }) => {
            return (
              <thead className="bg-muted" {...props}>
                {children}
              </thead>
            );
          },
          th: ({ children, ...props }) => {
            return (
              <th
                className="px-4 py-2 font-semibold text-foreground border-b border-border"
                {...props}
              >
                {children}
              </th>
            );
          },
          td: ({ children, ...props }) => {
            return (
              <td className="px-4 py-2 border-b border-border" {...props}>
                {children}
              </td>
            );
          },
          tr: ({ children, ...props }) => {
            return (
              <tr className="hover:bg-accent transition-colors" {...props}>
                {children}
              </tr>
            );
          },
        }}
      >
        {processedContent}
      </Streamdown>
    </div>
  );
};
