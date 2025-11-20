"use client";

import { TOGETHER_LINK } from "@/lib/utils";
import React, {
  useEffect,
  useState,
  useRef,
  useContext,
  createContext,
} from "react";

import { toast } from "sonner";

// Context for Together API Key
const TogetherApiKeyContext = createContext<
  | {
      apiKey: string | undefined;
      setApiKey: (key: string | undefined) => void;
    }
  | undefined
>(undefined);

export function TogetherApiKeyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [apiKey, setApiKeyState] = useState<string | undefined>(undefined);

  useEffect(() => {
    setApiKeyState(sessionStorage.getItem("togetherApiKey") || undefined);
  }, []);

  // Sync to sessionStorage and notify listeners
  const setApiKey = (key: string | undefined) => {
    setApiKeyState(key);
    if (key) {
      sessionStorage.setItem("togetherApiKey", key);
    } else {
      sessionStorage.removeItem("togetherApiKey");
    }
  };

  return (
    <TogetherApiKeyContext.Provider value={{ apiKey, setApiKey }}>
      {children}
    </TogetherApiKeyContext.Provider>
  );
}

export function useTogetherApiKey() {
  const context = useContext(TogetherApiKeyContext);
  if (!context) {
    throw new Error(
      "useTogetherApiKey must be used within a TogetherApiKeyProvider"
    );
  }
  return context;
}

export function ApiKeyControls() {
  const { apiKey, setApiKey } = useTogetherApiKey();
  const [togetherApiKey, setTogetherApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTogetherApiKey(apiKey || "");
  }, [apiKey]);

  const validateAndSaveApiKey = async (apiKey: string) => {
    setIsValidating(true);
    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      });

      if (response.ok) {
        setApiKey(apiKey);
        toast.success("API key validated and saved!");
        return true;
      } else {
        const errorData = await response.json();
        const errorMessage =
          errorData.message ||
          `API key validation failed with status: ${response.status}`;
        toast.error(errorMessage);

        if (errorMessage.startsWith("Invalid API key")) {
          setApiKey("");
          setTogetherApiKey("");
        }
        return false;
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleApiKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTogetherApiKey(value);

    if (value.length === 0) {
      setApiKey("");
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      await validateAndSaveApiKey(value);
    }, 500); // Debounce for 500ms
  };

  return (
    <div className="flex flex-col gap-3 w-full px-4 pb-2 border-t border-t-[#E5E7EB] pt-5">
      <p className="text-sm text-[#4a5565]">Add your Together API key</p>
      <div className="flex flex-col gap-1 rounded border border-[#d1d5dc] bg-white p-3 relative">
        <input
          type="password"
          placeholder="Together API key"
          className="text-sm text-[#4a5565] outline-none placeholder-[#d1d5dc] bg-transparent border-none focus:ring-0 p-0"
          value={togetherApiKey}
          onChange={handleApiKeyChange}
          autoComplete="off"
        />
        {isValidating && (
          <img
            src="/loading.svg"
            className="text-xs absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
          />
        )}
      </div>

      <p className="text-xs font-light text-left">
        <span className="text-[#99a1af]">Don't have an API key? </span>
        <a
          href={TOGETHER_LINK}
          target="_blank"
          rel="noreferrer"
          className="text-[#6a7282] underline underline-offset-2"
        >
          Get one for free.
        </a>
      </p>
    </div>
  );
}
