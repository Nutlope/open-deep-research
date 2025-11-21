"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ResearchEventStreamEvents } from "@/app/api/research/route";
import { TimelineEvent } from "./TimelineEvent";
import { TimelineEventLoader } from "./TimelineEventLoader";
import { cleanMarkdownToText, parseSlugFromUrl } from "@/lib/utils";

export default function TimelineProgress({
  events,
}: {
  events: ResearchEventStreamEvents[];
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new items are added
  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  };

  // Auto-scroll when items change
  useEffect(() => {
    if (events.length > 2) {
      setTimeout(scrollToBottom, 100);
    }
  }, [events.length]);

  const filteredEvents: ResearchEventStreamEvents[] = useMemo(() => {
    // only keep the last report_generating event
    const reportEvents = events.filter((e) => e.type === "report_generating");
    const lastReportEvent = reportEvents[reportEvents.length - 1];

    return events.filter((e) => {
      if (e.type === "report_generating") {
        return e.timestamp === lastReportEvent.timestamp;
      }
      return true;
    });
  }, [events]);

  const mapOfUrlsToContentProcessing = useMemo(() => {
    const map = new Map<
      string,
      {
        url: string;
        title: string;
        content: string;
      }
    >();
    for (const event of filteredEvents) {
      if (event.type === "content_processing") {
        map.set(event.url, {
          url: event.url,
          title: event.title,
          content: event.content || "",
        });
      }
    }
    return map;
  }, [filteredEvents]);

  if (filteredEvents.length <= 1) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-8 md:pt-0 w-full">
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto rounded-lg bg-white"
      >
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[9px] top-[1px] bottom-0 w-[1px] bg-[#D1D5DC]" />

          <AnimatePresence>
            {filteredEvents

              .map((event, index) => {
                const isLast = index === filteredEvents.length - 1;

                switch (event.type) {
                  case "planning_started":
                    return (
                      <TimelineEvent
                        key={index}
                        type={event.type}
                        isLast={isLast}
                        title="Research Topic"
                        description={event.topic}
                      />
                    );

                  case "planning_completed":
                    return (
                      <Fragment key={index}>
                        <TimelineEvent
                          type={event.type}
                          isLast={false}
                          title="Research strategy"
                          description={cleanMarkdownToText(event.plan)}
                        />
                        <TimelineEvent
                          type={event.type}
                          isLast={isLast}
                          title="Search queries ready"
                          queries={event.queries}
                        />
                      </Fragment>
                    );

                  case "search_completed":
                    return (
                      <TimelineEvent
                        key={index}
                        type={event.type}
                        isLast={isLast}
                        title={
                          <>
                            <span className="text-sm font-light text-left text-[#6a7282]">
                              Searched for
                            </span>
                            <span className="ml-1 text-sm text-left text-[#4a5565]">
                              ‘{event.query}‘
                            </span>
                          </>
                        }
                        webResults={event.urls.map((url) => {
                          return {
                            url: url,
                            title: mapOfUrlsToContentProcessing.has(url)
                              ? mapOfUrlsToContentProcessing.get(url)?.title ||
                                parseSlugFromUrl(url) ||
                                ""
                              : "Analyzing content...",
                          };
                        })}
                      />
                    );

                  case "content_summarized":
                    if (!event.title) return;
                    return (
                      <TimelineEvent
                        key={index}
                        type={event.type}
                        isLast={isLast}
                        title={
                          <>
                            <span className="text-sm font-light text-left text-[#6a7282]">
                              Summarized
                            </span>
                            <span className="ml-1 text-sm text-left text-[#4a5565]">
                              ‘{event.title}‘
                            </span>
                          </>
                        }
                      />
                    );

                  case "evaluation_completed":
                    return (
                      <Fragment key={index}>
                        <TimelineEvent
                          type={event.type}
                          isLast={false}
                          title="Analysis complete"
                          description={
                            cleanMarkdownToText(event.reasoning)?.slice(
                              0,
                              400
                            ) + "..." || ""
                          }
                        />
                        <TimelineEvent
                          key={index}
                          type={event.type}
                          isLast={isLast}
                          title="Planning next steps"
                          queries={event.additionalQueries}
                        />
                      </Fragment>
                    );

                  case "report_generating":
                    return (
                      <TimelineEvent
                        key={index}
                        type={event.type}
                        isLast={isLast}
                        title="Writing report..."
                        description={cleanMarkdownToText(event.partialReport)}
                      />
                    );

                  default:
                    return null;
                }
              })
              .filter(Boolean)}
          </AnimatePresence>

          <TimelineEventLoader />

          {/* Invisible element to scroll to */}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
