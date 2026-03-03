"use client";
import { getResearch } from "@/db/action";
import { toast } from "sonner";
import React from "react";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";

import { DownloadPdfButton } from "./DownloadPdfButton";
import { ReportBody } from "./ReportBody";

export const FinalReportPage = ({
  researchData,
}: {
  researchData: Awaited<ReturnType<typeof getResearch>>;
}) => {
  const { isSignedIn, isLoaded } = useUser();

  if (!researchData || !researchData.report) {
    return <></>;
  }

  return (
    <div className="flex flex-col size-full pt-0 md:pt-5 mx-auto max-w-[886px] px-5">
      <div className="flex flex-row gap-2 xl:px-4 items-start justify-between print:hidden mb-5">
        <div className="flex flex-row gap-2">
          {isLoaded && !isSignedIn && (
            <SignInButton>
              <button className="cursor-pointer flex flex-col justify-center items-center overflow-hidden gap-2.5 px-4 py-1.5 rounded bg-[#072d77] border-[0.5px] border-[#072d77]">
                <div className="flex justify-start items-center self-stretch relative gap-1.5">
                  <svg
                    width="11"
                    height="12"
                    viewBox="0 0 11 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-3"
                  >
                    <path
                      d="M5.5 1V11M10.5 6H0.5"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="flex-grow-0 flex-shrink-0 text-sm text-left text-white font-medium">
                    Generate your report
                  </p>
                </div>
              </button>
            </SignInButton>
          )}
        </div>
        <div className="flex flex-row gap-2">
          <button
            onClick={() => {
              const isMobile = /Mobi|Android/i.test(navigator.userAgent);
              if (isMobile && navigator.share) {
                navigator.share({ url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Copied to clipboard!");
              }
            }}
            className="cursor-pointer flex flex-col justify-center items-center overflow-hidden gap-2.5 px-3 py-1.5 rounded border-[0.5px] border-[#cad5e2]"
            style={{ filter: "drop-shadow(0px 1px 5px rgba(0,0,0,0.15))" }}
          >
            <div className="flex justify-start items-center self-stretch relative gap-1.5">
              <img src="/share.svg" alt="" className="size-4" />
              <p className="flex-grow-0 flex-shrink-0 text-sm text-left text-[#314158]">
                Share
              </p>
            </div>
          </button>
          <button
            onClick={() => {
              // copy report to markdown
              toast.success("Copied markdown to clipboard!");
              navigator.clipboard.writeText(researchData.report || "");
            }}
            className="cursor-pointer hidden md:flex flex-col justify-center items-center overflow-hidden gap-2.5 px-3 py-1.5 rounded border-[0.5px] border-[#cad5e2]"
            style={{ filter: "drop-shadow(0px 1px 5px rgba(0,0,0,0.15))" }}
          >
            <div className="flex justify-start items-center self-stretch relative gap-1.5">
              <img src="/copy.svg" alt="" className="size-4" />

              <p className="flex-grow-0 flex-shrink text-sm text-left text-[#314158]">
                Copy markdown
              </p>
            </div>
          </button>
          <DownloadPdfButton fileName={researchData.researchTopic ?? undefined} />
        </div>
      </div>

      <div className="print:block hidden text-lg text-zinc-400 leading-5 mx-auto text-center mb-5">
        <a href="/" className="flex flex-row items-center gap-2">
          <div className="flex flex-row items-center gap-2">
            <div className=" text-zinc-800 dark:text-zinc-100">
              <img
                src="/logo.svg"
                alt="Open Deep Research"
                className="size-6"
              />
            </div>
            <div className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
              Open Deep Research
            </div>
          </div>
        </a>
      </div>

      <ReportBody researchData={researchData} />
    </div>
  );
};
