"use client";
import React, { useMemo } from "react";

import { CustomMarkdown } from "../CustomMarkdown";
import { LocationMap } from "../LocationMap";
import { WebResultCard } from "./reportLoading/WebResultCard";
import { CitationNumber } from "./citations/CitationNumber";
import { cn } from "@/lib/utils";
import { extractMarkdownHeadings } from "@/lib/utils";
import { TableOfContents } from "./TableOfContents";

// Function to extract location data from structured MAP_LOCATION format
const extractLocationsFromMarkdown = (markdown: string) => {
  const locations: Array<{
    name: string;
    address?: string;
    lat: number;
    lng: number;
    type?: string;
    url?: string;
    description?: string;
  }> = [];

  // Look for MAP_LOCATION format: MAP_LOCATION:name|address|lat,lng|description|url
  const lines = markdown.split('\n');

  for (const line of lines) {
    const locationMatch = line.match(/^MAP_LOCATION:([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)$/);
    if (locationMatch) {
      const [, name, address, coords, description, url] = locationMatch;

      // Parse coordinates
      const coordMatch = coords.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);

        locations.push({
          name: name.trim(),
          address: address.trim(),
          lat,
          lng,
          type: 'location', // Generic type
          url: url.trim(),
          description: description.trim()
        });
      }
    }
  }

  return locations;
};

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
    status?: "questions" | "pending" | "processing" | "completed";
  };
}) => {
  if (!researchData || !researchData.report) {
    return <></>;
  }

  // Extract locations for map display
  const extractedLocations = useMemo(() => {
    return researchData.report
      ? extractLocationsFromMarkdown(researchData.report)
      : [];
  }, [researchData.report]);

  // Demo locations for testing (hardcoded fake restaurants in MAP_LOCATION format)
  const demoLocations = useMemo(() => [
    {
      name: "Le Bernardin",
      address: "155 W 51st St, New York, NY 10019",
      lat: 40.7614,
      lng: -73.9855,
      type: "restaurant",
      url: "https://www.le-bernardin.com",
      description: "3 Michelin-starred seafood restaurant in Midtown Manhattan"
    },
    {
      name: "Nobu Fifty Seven",
      address: "40 W 57th St, New York, NY 10019",
      lat: 40.7639,
      lng: -73.9767,
      type: "restaurant",
      url: "https://www.noburestaurants.com/fifty-seven",
      description: "Upscale Japanese-Peruvian fusion cuisine"
    },
    {
      name: "Eleven Madison Park",
      address: "11 Madison Ave, New York, NY 10010",
      lat: 40.7416,
      lng: -73.9866,
      type: "restaurant",
      url: "https://www.elevenmadisonpark.com",
      description: "3 Michelin-starred fine dining with tasting menus"
    },
    {
      name: "Per Se",
      address: "10 Columbus Circle, New York, NY 10019",
      lat: 40.7680,
      lng: -73.9829,
      type: "restaurant",
      url: "https://www.perseny.com",
      description: "Thomas Keller's 3 Michelin-starred restaurant"
    },
    {
      name: "Daniel",
      address: "60 E 65th St, New York, NY 10065",
      lat: 40.7669,
      lng: -73.9675,
      type: "restaurant",
      url: "https://www.danielnyc.com",
      description: "French fine dining with 2 Michelin stars"
    }
  ], []);

  // Use extracted locations if available, otherwise use demo locations for testing
  const locations =
    extractedLocations.length > 0 ? extractedLocations : demoLocations;

  // Clean report content by removing MAP_LOCATION lines for display
  const cleanReport = useMemo(() => {
    if (!researchData.report) return "";
    return researchData.report
      .split('\n')
      .filter(line => !line.startsWith('MAP_LOCATION:'))
      .join('\n');
  }, [researchData.report]);

  // Split report content to embed map after first substantial paragraph
  const { beforeMap, afterMap } = useMemo(() => {
    if (!cleanReport) return { beforeMap: "", afterMap: "" };

    const lines = cleanReport.split('\n');
    let contentStartIndex = -1;
    let firstParagraphEndIndex = -1;

    // Find where actual content starts (skip headers)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#') && !line.startsWith('!') && line.length > 10) {
        contentStartIndex = i;
        break;
      }
    }

    if (contentStartIndex === -1) {
      return { beforeMap: cleanReport, afterMap: "" };
    }

    // Find the end of the first substantial paragraph
    for (let i = contentStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for paragraph break (empty line) or next heading
      if (line === '' || line.startsWith('#')) {
        firstParagraphEndIndex = i;
        break;
      }
    }

    if (firstParagraphEndIndex === -1) {
      // If no paragraph break found, put map after first 200 characters
      const content = lines.slice(contentStartIndex).join('\n');
      if (content.length > 200) {
        const splitIndex = contentStartIndex + Math.floor((lines.length - contentStartIndex) * 0.3);
        return {
          beforeMap: lines.slice(0, splitIndex).join('\n'),
          afterMap: lines.slice(splitIndex).join('\n')
        };
      }
      return { beforeMap: cleanReport, afterMap: "" };
    }

    return {
      beforeMap: lines.slice(0, firstParagraphEndIndex).join('\n'),
      afterMap: lines.slice(firstParagraphEndIndex).join('\n')
    };
  }, [cleanReport]);

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

      {/* Research Type Badge */}
      {researchData.outputType && (
        <div className="flex justify-center xl:justify-start mb-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              researchData.outputType === "smart"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            )}
          >
            {researchData.outputType === "smart" ? (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            )}
            {researchData.outputType === "smart"
              ? "Smart Report"
              : "Academic Report"}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse xl:flex-row gap-6 px-5 pt-3">
         {/* Main Content */}
         <div className="max-w-[600px]">
           {/* Content before map */}
           {beforeMap && (
             <CustomMarkdown sources={researchData.sources || []}>
               {beforeMap}
             </CustomMarkdown>
           )}

           {/* Location Map - Embedded in content flow when report is completed */}
           {researchData.status === "completed" && locations.length > 0 && (
             <div className="w-full my-6">
               <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                 <h4 className="text-sm font-semibold text-gray-800 mb-2">📍 Locations Mentioned</h4>
                 <p className="text-xs text-gray-600 mb-3">
                   Interactive map showing key locations from this report.
                 </p>
                 <LocationMap locations={locations} height={300} />
               </div>
             </div>
           )}

           {/* Content after map */}
           {afterMap && (
             <CustomMarkdown sources={researchData.sources || []}>
               {afterMap}
             </CustomMarkdown>
           )}

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
         <TableOfContents markdown={cleanReport} />
      </div>
    </div>
  );
};
