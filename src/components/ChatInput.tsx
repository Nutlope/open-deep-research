"use client";
import { useState, useRef, useEffect } from "react";
import cn from "classnames";
import { ArrowUpIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_MODELS, DEFAULT_ANSWER_MODEL } from "@/deepresearch/config";

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
    model?: string;
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
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedModel") || DEFAULT_ANSWER_MODEL;
    }
    return DEFAULT_ANSWER_MODEL;
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
      localStorage.setItem("selectedModel", selectedModel);
    }
  }, [input, outputType, selectedModel]);

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
        onPaste={(event) => {
          event.preventDefault();
          const pastedText = event.clipboardData.getData('text');
          const normalized = pastedText.trim().replace(/\s+/g, ' ');
          const newValue = input.slice(0, textareaRef.current?.selectionStart ?? input.length) + normalized + input.slice(textareaRef.current?.selectionEnd ?? input.length);
          setInput(newValue);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            if (input === "") {
              return;
            }

            append({
              role: "user",
              content: input.trim().replace(/\s+/g, ' '),
              createdAt: new Date(),
              outputType,
              model: selectedModel,
            });

            setInput("");
            if (typeof window !== "undefined") {
              localStorage.removeItem("chatInput");
            }
          }
        }}
      />

      <div className="absolute bottom-2.5 left-2.5 flex justify-start items-center gap-2 p-1 rounded-md bg-white border border-gray-200">
        <div
          onClick={() => setOutputType("academic")}
          className={cn(
            "flex justify-center items-center flex-grow-0 flex-shrink-0 h-[26px] relative gap-1.5 px-1.5 py-[5px] rounded cursor-pointer",
            outputType === "academic" ? "bg-[#1e3539]" : ""
          )}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-grow-0 flex-shrink-0 w-4 h-4 relative"
            preserveAspectRatio="none"
          >
            <path
              d="M2.84005 6.76461C2.65668 8.16833 2.54742 9.58073 2.51272 10.9959C4.43192 11.7976 6.2695 12.7822 8.00005 13.9359C9.73081 12.7821 11.5686 11.7976 13.4881 10.9959C13.4533 9.58073 13.3441 8.16833 13.1607 6.76461M13.1607 6.76461C13.744 6.56861 14.3354 6.38728 14.9327 6.22195C12.7571 4.69678 10.4347 3.39254 8.00005 2.32861C5.56538 3.39276 3.24298 4.69723 1.06738 6.22261C1.6629 6.38703 2.25379 6.56777 2.83938 6.76461C4.61846 7.36275 6.34465 8.10799 8.00005 8.99261C9.65522 8.10799 11.3818 7.36274 13.1607 6.76461ZM4.50005 9.99995C4.63266 9.99995 4.75983 9.94727 4.8536 9.8535C4.94737 9.75973 5.00005 9.63255 5.00005 9.49995C5.00005 9.36734 4.94737 9.24016 4.8536 9.14639C4.75983 9.05262 4.63266 8.99995 4.50005 8.99995C4.36744 8.99995 4.24026 9.05262 4.1465 9.14639C4.05273 9.24016 4.00005 9.36734 4.00005 9.49995C4.00005 9.63255 4.05273 9.75973 4.1465 9.8535C4.24026 9.94727 4.36744 9.99995 4.50005 9.99995ZM4.50005 9.99995V7.54995C5.63121 6.84684 6.79958 6.20546 8.00005 5.62861M3.32872 13.3286C3.7007 12.9575 3.99567 12.5166 4.19669 12.0312C4.39771 11.5457 4.5008 11.0254 4.50005 10.4999V9.49995"
              stroke={outputType === "academic" ? "white" : "#596263"}
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className={cn("flex-grow-0 flex-shrink-0 text-sm text-left", outputType === "academic" ? "text-white" : "text-[#596263]")}>Academic</p>
        </div>
        <div
          onClick={() => setOutputType("smart")}
          className={cn(
            "flex justify-center items-center flex-grow-0 flex-shrink-0 h-[26px] relative gap-1.5 px-1.5 py-[5px] rounded cursor-pointer",
            outputType === "smart" ? "bg-[#391e36]" : ""
          )}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-grow-0 flex-shrink-0 w-4 h-4 relative"
            preserveAspectRatio="none"
          >
            <path
              d="M2.5 9L9.5 1.5L8 7H13.5L6.5 14.5L8 9H2.5Z"
              stroke={outputType === "smart" ? "white" : "#756974"}
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className={cn("flex-grow-0 flex-shrink-0 text-sm text-left", outputType === "smart" ? "text-white" : "text-[#756974]")}>Smart</p>
        </div>
      </div>

      <div className="absolute bottom-2.5 right-12 flex flex-row gap-2">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="h-[26px] w-[95px] text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors focus:outline-none data-[placeholder]:text-[#6B7280]">
            <SelectValue placeholder="Model" className="text-[#6B7280] text-xs font-medium" />
          </SelectTrigger>
          <SelectContent className="rounded-md border border-gray-200 shadow-lg bg-white">
            {AVAILABLE_MODELS.map((model) => (
              <SelectItem
                key={model.value}
                value={model.value}
                className="cursor-pointer hover:bg-gray-50 py-1.5 pl-8 pr-2 text-sm rounded-sm focus:bg-accent focus:text-accent-foreground"
              >
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              content: input.trim().replace(/\s+/g, ' '),
              createdAt: new Date(),
              outputType,
              model: selectedModel,
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
