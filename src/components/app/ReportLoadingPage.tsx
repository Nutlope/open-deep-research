"use client";

import { useEffect, useState } from "react";
import { Heading } from "../Heading";
import { ReportSteps, ReportStepType } from "./reportLoading/ReportSteps";
import TimelineProgress from "./reportLoading/TimelineProgress";
import { ResearchEventStreamEvents } from "@/app/api/research/route";
import { StreamingReportBody } from "./reportLoading/StreamingReportBody";

export const ReportLoadingPage = ({
  researchTopic,
  chatId,
  researchStartedAt,
  onComplete,
}: {
  researchStartedAt: Date;
  researchTopic: string;
  chatId: string;
  onComplete: () => void;
}) => {
  const [streamEvents, setStreamEvents] = useState<ResearchEventStreamEvents[]>(
    []
  );
  const [steps, setSteps] = useState<ReportStepType[]>([
    {
      id: "initial_planning",
      title: "Initial planning",
      status: "loading",
    },
    {
      id: "iteration_1",
      title: "Gathering sources",
      status: "pending",
    },
    {
      id: "iteration_2",
      title: "Analyzing information",
      status: "pending",
    },
    {
      id: "iteration_3",
      title: "Refining insights",
      status: "pending",
    },
    {
      id: "writing_report",
      title: "Writing your report",
      status: "pending",
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  const onResearchEnd = () => {
    setIsStreaming(false);
    onComplete();
  };

  const fetchResearch = async (chatId: string) => {
    try {
      const response = await fetch(`/api/research/?chatId=${chatId}`);
      if (!response.ok) throw new Error("Failed to fetch research data");

      const events: ResearchEventStreamEvents[] = await response.json();

      const isCompleted =
        events.some((event) => event.type === "research_completed") ||
        events.some(
          (event) =>
            event.type === "research_status" && event.status === "completed"
        );

      if (isCompleted) {
        onResearchEnd();
      } else {
        if (!isStreaming) setIsStreaming(true);
      }

      // Update research data, maintaining chronological order
      setStreamEvents(
        events.sort((a: any, b: any) => a.timestamp - b.timestamp)
      );
      return { isCompleted: isCompleted };
    } catch (error) {
      console.error("Error fetching research:", error);
      setIsStreaming(false);
      return { isCompleted: true };
    }
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let isPolling = true;

    const pollResearch = async () => {
      if (!isPolling) return;

      const { isCompleted } = await fetchResearch(chatId);

      if (!isCompleted && isPolling) {
        pollInterval = setTimeout(pollResearch, 4000);
      }
    };

    // Start polling
    pollResearch();

    // Cleanup function
    return () => {
      isPolling = false;
      if (pollInterval) clearTimeout(pollInterval);
    };
  }, []);

  useEffect(() => {
    if (streamEvents.length > 0) {
      const newSteps = [...steps];
      streamEvents.map((event) => {
        // parsing for steps
        if (event.type === "planning_completed") {
          newSteps[0].status = "completed";
          newSteps[1].status = "loading";
        }
        if (
          event.type === "evaluation_completed" ||
          event.type === "iteration_completed"
        ) {
          if (event.iteration === 1) {
            newSteps[1].status = "completed";
            newSteps[2].status = "loading";
          }
          if (event.iteration === 2) {
            newSteps[2].status = "completed";
            newSteps[3].status = "loading";
          }
          if (event.iteration === 3) {
            newSteps[3].status = "completed";
            newSteps[4].status = "loading";
          }
        }
        if (event.type === "report_generated") {
          newSteps[4].status = "completed";
        }
      });
      setSteps(newSteps);
    }
  }, [streamEvents]);

  // extract from streamEvents the coverUrl event to get url
  const coverUrl = streamEvents.find(
    (event) => event.type === "cover_generation_completed"
  )?.coverImage;

  const report = streamEvents
    .filter((event) => event.type === "report_generating")
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.partialReport;

  if (coverUrl && report)
    return (
      <div className="flex flex-col size-full pt-20 md:pt-5 mx-auto max-w-[886px] relative px-5">
        <StreamingReportBody
          researchTopic={researchTopic}
          coverUrl={coverUrl}
          report={report}
        />
      </div>
    );

  return (
    <div className="px-5 py-5 h-full flex flex-col flex-1 mx-auto max-w-[700px] w-full">
      <Heading
        title={
          researchTopic.length > 60
            ? researchTopic.slice(0, 60) + "..."
            : researchTopic
        }
        description="It takes a few minutes to gather sources, analyze data, and create your report."
      />

      <div className="flex flex-col gap-2 md:flex-row">
        <ReportSteps
          steps={steps}
          chatId={chatId}
          researchStartedAt={researchStartedAt}
        />

        <TimelineProgress events={streamEvents} />
      </div>
    </div>
  );
};
