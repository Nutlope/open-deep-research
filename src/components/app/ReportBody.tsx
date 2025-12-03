"use client";

import { CustomMarkdown } from "../CustomMarkdown";
import { cn } from "@/lib/utils";
import { WebResultCard } from "./reportLoading/WebResultCard";
import { CitationNumber } from "./citations/CitationNumber";
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
    outputType?: "academic" | "smart" | null;
  };
}) => {
  if (!researchData || !researchData.report) {
    return <></>;
  }

  return (
    <div className="border border-[#E2E8F0] rounded-lg pb-4 mb-6 print:border-none">
       {researchData.coverUrl && (
         <div className="w-full h-[202px] md:h-[305px] relative overflow-hidden rounded-lg pb-4">
           <img
             src={researchData.coverUrl}
             className="w-full h-full object-cover rounded"
             alt=""
           />
           {researchData.outputType && (
             <div className={cn("absolute top-2 left-2 w-[26px] h-[26px] rounded flex items-center justify-center", researchData.outputType === "academic" ? "bg-[#1e3539]" : "bg-[#391e36]")} style={{boxShadow: '0 0 2px rgba(255,255,255,0.8)'}}>
               {researchData.outputType === "academic" ? (
                 <svg
                   width={16}
                   height={16}
                   viewBox="0 0 16 16"
                   fill="none"
                   className="w-4 h-4"
                 >
                   <path
                     d="M2.84005 6.76461C2.65668 8.16833 2.54742 9.58073 2.51272 10.9959C4.43192 11.7976 6.2695 12.7822 8.00005 13.9359C9.73081 12.7821 11.5686 11.7976 13.4881 10.9959C13.4533 9.58073 13.3441 8.16833 13.1607 6.76461M13.1607 6.76461C13.744 6.56861 14.3354 6.38728 14.9327 6.22195C12.7571 4.69678 10.4347 3.39254 8.00005 2.32861C5.56538 3.39276 3.24298 4.69723 1.06738 6.22261C1.6629 6.38703 2.25379 6.56777 2.83938 6.76461C4.61846 7.36275 6.34465 8.10799 8.00005 8.99261C9.65522 8.10799 11.3818 7.36274 13.1607 6.76461ZM4.50005 9.99995C4.63266 9.99995 4.75983 9.94727 4.8536 9.8535C4.94737 9.75973 5.00005 9.63255 5.00005 9.49995C5.00005 9.36734 4.94737 9.24016 4.8536 9.14639C4.75983 9.05262 4.63266 8.99995 4.50005 8.99995C4.36744 8.99995 4.24026 9.05262 4.1465 9.14639C4.05273 9.24016 4.00005 9.36734 4.00005 9.49995C4.00005 9.63255 4.05273 9.75973 4.1465 9.8535C4.24026 9.94727 4.36744 9.99995 4.50005 9.99995ZM4.50005 9.99995V7.54995C5.63121 6.84684 6.79958 6.20546 8.00005 5.62861M3.32872 13.3286C3.7007 12.9575 3.99567 12.5166 4.19669 12.0312C4.39771 11.5457 4.5008 11.0254 4.50005 10.4999V9.49995"
                     stroke="white"
                     strokeWidth="0.8"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                   />
                 </svg>
               ) : (
                 <svg
                   width={16}
                   height={16}
                   viewBox="0 0 16 16"
                   fill="none"
                   className="w-4 h-4"
                 >
                   <path
                     d="M2.5 9L9.5 1.5L8 7H13.5L6.5 14.5L8 9H2.5Z"
                     stroke="white"
                     strokeWidth="0.8"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                   />
                 </svg>
               )}
             </div>
           )}
         </div>
       )}

      <div className="flex flex-col-reverse xl:flex-row gap-6 px-5">
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
