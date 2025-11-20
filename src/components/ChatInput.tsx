"use client";
import { useState, useRef, useEffect } from "react";
import cn from "classnames";
import { ArrowUpIcon } from "./icons";
import { Switch } from "@/components/ui/switch";

export const ChatInput = ({
  append,
  disabled,
}: {
  disabled?: boolean;
  append: (message: {
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    outputType?: "academic" | "smart";
  }) => void;
}) => {
  const [input, setInput] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chatInput") || "";
    }
    return "";
  });
  const [outputType, setOutputType] = useState<"academic" | "smart">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("outputType") as "academic" | "smart") || "smart"
      );
    }
    return "smart";
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 400);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("chatInput", input);
      localStorage.setItem("outputType", outputType);
    }
  }, [input, outputType]);

  return (
    <div
      className="p-3 relative overflow-hidden rounded-lg max-w-[640px] mx-auto w-full flex"
      style={{
        border: "1px solid transparent",
        borderRadius: "8px",
        background: `
          linear-gradient(white, white) padding-box,
          radial-gradient(circle at center, #072D77, #D1D5DC) border-box
        `,
        backgroundOrigin: "border-box",
        backgroundRepeat: "no-repeat",
        boxShadow: "0px 1px 13px -6px rgba(0,0,0,0.2)",
      }}
    >

      <textarea
        ref={textareaRef}
        className="mb-12 resize-none w-full min-h-12 outline-none bg-transparent placeholder:text-zinc-400 max-h-[240px] overflow-y-auto"
        placeholder="Type your message (Enter to send, Shift+Enter for new line)"
        value={input}
        disabled={disabled}
        onChange={(event) => {
          setInput(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (input === "") {
              return;
            }

            append({
              role: "user",
              content: input.trimEnd(),
              createdAt: new Date(),
              outputType,
            });

            setInput("");
            if (typeof window !== "undefined") {
              localStorage.removeItem("chatInput");
            }
          }
        }}
      />

      <div className="absolute bottom-2.5 left-2.5 flex items-center bg-white/80 backdrop-blur-sm rounded-md border border-gray-200 p-0.5">
        <button
          onClick={() => setOutputType("smart")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200",
            outputType === "smart"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Smart
        </button>
        <button
          onClick={() => setOutputType("academic")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200",
            outputType === "academic"
              ? "bg-purple-500 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Academic
        </button>
      </div>

      <div className="absolute bottom-2.5 right-2.5 flex flex-row gap-2">
        <button
          className={cn(
            "size-[26px] flex flex-row justify-center items-center bg-[#093999] text-white rounded"
          )}
          onClick={() => {
            if (input === "") {
              return;
            }

            append({
              role: "user",
              content: input.trimEnd(),
              createdAt: new Date(),
              outputType,
            });
            setInput("");
            if (typeof window !== "undefined") {
              localStorage.removeItem("chatInput");
            }
          }}
        >
          <ArrowUpIcon size={12} />
        </button>
      </div>
    </div>
  );
};
