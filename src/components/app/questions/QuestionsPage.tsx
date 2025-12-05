"use client";

import { useState, useEffect } from "react";
import { Heading } from "../../Heading";
import { AnswerInput } from "./AnswerInput";
import { TooltipUsage } from "../tooltip/TooltipUsage";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTogetherApiKey } from "../ApiKeyControls";

export const QuestionsPage = ({
  questions,
  chatId,
}: {
  questions: string[];
  chatId: string;
}) => {
  const { apiKey } = useTogetherApiKey();
  const [answers, setAnswers] = useState<string[]>(
    Array(questions.length).fill("")
  );
  const [remainingResearches, setRemainingResearches] = useState(0);
  const [resetTime, setResetTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const router = useRouter();

  const onSaveAnswers = async (answersToSave: string[]) => {
    if (isLoading) return; // Prevent multiple clicks

    setIsLoading(true);
    try {
      const response = await fetch("/api/storeAnswers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          answers: answersToSave,
          togetherApiKey: apiKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Your search will start shortly!");
        router.refresh();
      } else {
        toast.error(data.message || "Failed to process your request.");
        setIsLoading(false); // Re-enable buttons on error
      }
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("An unexpected error occurred.");
      setIsLoading(false); // Re-enable buttons on error
    }
  };

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch("/api/user/limits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isBringingKey: !!apiKey,
          }),
        });
        const data = await response.json();
        setRemainingResearches(data.remaining);
        setResetTime(data.reset);
      } catch (error) {
        console.error("Failed to fetch limits:", error);
      }
    };

    if (userId) {
      fetchLimits();
    }

    const handleFocus = () => {
      if (userId) {
        fetchLimits();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId]);

  // Refetch limits when apiKey changes and userId is present
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch("/api/user/limits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isBringingKey: !!apiKey,
          }),
        });
        const data = await response.json();
        setRemainingResearches(data.remaining);
        setResetTime(data.reset);
      } catch (error) {
        console.error("Failed to fetch limits:", error);
      }
    };
    if (userId) {
      fetchLimits();
    }
  }, [apiKey, userId]);

  return (
    <div className="my-5 px-5 h-full flex flex-col flex-1 max-w-[700px] mx-auto w-full">
      <Heading
        title="Answer some questions for a more accurate report"
        description="This is optional, you can skip this by clicking “Generate Report” or “Skip”."
      />
      <div className="flex flex-col gap-4">
        {questions?.map((question, index) => (
          <AnswerInput
            key={index}
            question={question}
            answer={answers[index]}
            setAnswer={(answer) => {
              setAnswers((prev) => {
                const newAnswers = [...prev];
                newAnswers[index] = answer;
                return newAnswers;
              });
            }}
            onEnter={() => {
              if (index === questions.length - 1 && userId && !isLoading) {
                onSaveAnswers(answers);
              }
            }}
          />
        ))}
      </div>

      <div className="w-full items-start flex flex-col gap-3 self-end justify-end flex-1 md:flex-auto  md:mt-[200px] md:flex-row-reverse pb-8">
        <button
          className="px-5 py-1.5 text-base font-medium !text-[#6a7282] cursor-pointer border border-[#6a7282]/50 rounded w-full md:w-[165px] items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            onSaveAnswers([]); // Pass an empty array to skip questions
          }}
          disabled={remainingResearches <= 0 || isLoading}
        >
          {isLoading ? "Processing..." : "Skip"}
        </button>

        <div className="flex flex-col gap-2 w-full md:w-fit">
          <button
            className="flex flex-col justify-between items-center w-full md:w-[165px] h-[38px] overflow-hidden px-5 py-1.5 rounded bg-[#072d77] border border-[#072d77] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              if (userId) {
                onSaveAnswers(answers);
              }
            }}
            disabled={remainingResearches <= 0 || isLoading}
          >
            <div className="flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-1.5">
              <p className="flex-grow-0 flex-shrink-0 text-base font-medium text-left text-white">
                {isLoading ? "Generating..." : "Generate Report"}
              </p>
            </div>
          </button>
          <TooltipUsage
            remainingResearches={remainingResearches}
            resetTime={resetTime}
          />
        </div>
      </div>
    </div>
  );
};
