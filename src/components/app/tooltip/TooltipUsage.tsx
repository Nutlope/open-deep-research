"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { intervalToDuration, formatDuration } from "date-fns";
import { useTogetherApiKey } from "@/components/app/AppSidebar";

export const TooltipUsage = ({
  remainingResearches,
  resetTime,
}: {
  remainingResearches: number;
  resetTime: string | null;
}) => {
  const customApiKey = useTogetherApiKey();

  if (customApiKey) {
    return null;
  }

  if (!resetTime) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <div className="relative flex flex-row items-center justify-center">
          <img src="/tooltip.svg" alt="" className="size-4 mr-[1px]" />
          <span className="text-xs text-[#6a7282]">
            Researches left: <strong>{remainingResearches}</strong>
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="!p-0 !border-0 !bg-transparent">
        <div className="mb-2 w-[235px] overflow-hidden rounded bg-gray-50 border border-[#d1d5dc] z-10 p-3">
          <p className="text-sm text-left text-[#1e2939]">
            <span className="text-sm text-left text-[#1e2939]">
              Your credits will be reset in{" "}
            </span>
            <span className="text-sm font-bold text-left text-[#1e2939]">
              {formatDuration(
                intervalToDuration({
                  start: new Date(),
                  end: new Date(resetTime),
                }),
                {
                  format: ["hours", "minutes"],
                  zero: true,
                  delimiter: " ",
                  locale: {
                    formatDistance: (token, count) => {
                      if (token === "xHours") return `${count} hr`;
                      if (token === "xMinutes") return `${count} min`;
                      return "";
                    },
                  },
                }
              )}
            </span>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
