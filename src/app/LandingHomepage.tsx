"use client";
import { ChatInput } from "@/components/ChatInput";
import { Footer } from "@/components/Footer";
import { createResearchAndRedirect } from "@/db/action";
import { SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { useState } from "react";
import LoadingChat from "./chat/[chatId]/loading";
import { LandingHero } from "@/components/LandingHero";
import { LandingCard } from "@/components/LandingCard";

export const LandingHomepage = () => {
  const { isSignedIn, user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  if (isLoading) return <LoadingChat />;

  return (
    <div className="flex flex-col size-full items-center min-h-screen justify-center relative md:bg-[url('/bg.svg')] md:bg-no-repeat md:bg-center md:bg-[size:auto_100%]">
      <div className="px-4 pb-4 pt-8 flex flex-col items-center w-full max-w-3xl justify-center gap-4">
        <LandingHero />

        {!isLoaded ? (
          <div className="h-[66px] w-full" />
        ) : !isSignedIn ? (
          <SignedOut>
            <div className="flex flex-col gap-2">
              <SignInButton>
                <div className="flex justify-center items-center relative gap-1.5 px-5 py-2 rounded bg-[#072d77] border-[0.5px] border-[#072d77] cursor-pointer">
                  <p className="flex-grow-0 flex-shrink-0 text-base font-medium text-left text-white">
                    Generate a report
                  </p>
                </div>
              </SignInButton>
              <p className="text-xs text-center text-[#99a1af] pb-4">
                Fully{" "}
                <a
                  href="https://github.com/Nutlope/open-deep-research"
                  className="underline font-semibold hover:text-[#072d77] transition"
                >
                  open source
                </a>
              </p>
            </div>
            <div className="max-w-[760px] min-h-[258px] w-fit md:w-full relative overflow-hidden rounded-xl bg-[#f2f6ff] border border-gray-200 px-7 py-5 flex flex-col gap-4 mb-12">
              <p className="text-base text-center md:text-left text-[#364153] font-serif">
                How it works:
              </p>
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <LandingCard
                  imageSrc="/cards/question.jpg"
                  title="Ask your question"
                  description="Type any topic or problem into the prompt box."
                />
                <LandingCard
                  imageSrc="/cards/search.jpg"
                  title="We Research & Refine"
                  description="Deep Research scans vetted sources and extracts the signal."
                />
                <LandingCard
                  imageSrc="/cards/report.jpg"
                  title="Get an Actionable Brief"
                  description="Receive a concise, referenced report you can save or share."
                />
              </div>
            </div>
          </SignedOut>
        ) : (
          <ChatInput
            disabled={!isLoaded || isLoading}
            append={(message) => {
              setIsLoading(true);
              createResearchAndRedirect({
                clerkUserId: isSignedIn ? user.id : undefined,
                initialUserMessage: message.content,
                outputType: message.outputType,
                model: message.model,
              });
            }}
          />
        )}

        <Footer />
      </div>
    </div>
  );
};
