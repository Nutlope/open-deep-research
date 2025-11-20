"use client";
import React from "react";

import { CustomMarkdown } from "../CustomMarkdown";
import { cn } from "@/lib/utils";
import { WebResultCard } from "./reportLoading/WebResultCard";
import { CitationNumber } from "./citations/CitationNumber";
import { extractMarkdownHeadings } from "@/lib/utils";
import { TableOfContents } from "./TableOfContents";

export const ReportBody = ({
  researchData,
}: {
  researchData: {
    researchTopic: string | null;
    report: string | null;
    sources?: Array<{ url: string; title: string }> | null;
    coverUrl: string | null;
    citations?: Array<{
      url: string;
      title: string;
      citation: string;
    }> | null;
    outputType?: "academic" | "smart";
  };
}) => {
  if (!researchData || !researchData.report) {
    return <></>;
  }

  return (
    <div className="border border-[#E2E8F0] rounded-lg pb-4 mb-6 print:border-none">
      {researchData.coverUrl && (
        <div className="w-full h-[202px] md:h-[305px] relative overflow-hidden rounded-lg">
          <img
            src={researchData.coverUrl}
            className="w-full h-full object-cover rounded"
            alt=""
          />
        </div>
      )}
       <div className="flex flex-col-reverse xl:flex-row gap-6 px-5 pt-3">
         {/* Research Type Badge */}
         {researchData.outputType && (
           <div className="flex justify-center xl:justify-start mb-2">
             <div className={cn(
               "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
               researchData.outputType === "smart"
                 ? "bg-blue-100 text-blue-700"
                 : "bg-purple-100 text-purple-700"
             )}>
               {researchData.outputType === "smart" ? (
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
               ) : (
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                 </svg>
               )}
               {researchData.outputType === "smart" ? "Smart Report" : "Academic Report"}
             </div>
           </div>
         )}

         {/* Main Content */}
         <div className="max-w-[600px]">
          <CustomMarkdown sources={researchData.sources || []}>
            {researchData.report}
          </CustomMarkdown>
          {researchData.sources && researchData.sources?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              <h3 className="text-lg font-medium text-[#101828] col-span-full mb-2">
                We used {researchData.sources.length} sources for this research:
              </h3>
              {researchData.sources.map((result, idx) => (
                <WebResultCard
                  key={result.url + "-" + idx}
                  result={result}
                  id={result.url}
                >
                  <CitationNumber num={idx + 1} />
                </WebResultCard>
              ))}
            </div>
          )}
        </div>

        {/* Table of Contents */}
        <TableOfContents markdown={researchData.report || ""} />
      </div>
    </div>
  );
};
