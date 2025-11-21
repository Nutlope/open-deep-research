import { db } from "@/db";
import { eq } from "drizzle-orm";
import { research } from "@/db/schema";
import { Metadata } from "next";
import { getResearch } from "@/db/action";
import { redirect } from "next/navigation";
import { generateObject, generateText } from "ai";
import { MODEL_CONFIG, PROMPTS, REPLY_LANGUAGE } from "@/deepresearch/config";
import dedent from "dedent";
import { togetheraiClient } from "@/deepresearch/apiClients";
import z from "zod";
import { ChatPage } from "@/components/app/ChatPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chatId: string }>;
}): Promise<Metadata> {
  const { chatId } = await params;

  if (!chatId) {
    return {
      title: "Chat Not Found | Open Deep Research",
      description: "This chat could not be found on Open Deep Research",
    };
  }

  const researchData = chatId ? await getResearch(chatId) : undefined;

  if (!researchData) {
    return redirect("/");
  }

  const topic = researchData.title || researchData.initialUserMessage;

  const title = `${topic} | Open Deep Research`;
  const description = `Discover the research on "${topic}" generated using ${
    researchData.sources && researchData.sources?.length > 0
      ? researchData.sources.length
      : "multiple"
  } sources on Open Deep Research`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: researchData.coverUrl ? [researchData.coverUrl] : [],
    },
  };
}

export default async function Page(props: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await props.params; // get the chat ID from the URL
  const researchData = await getResearch(chatId); // load the chat

  // if we get chat without questions, generate questions with AI LLM and save to DB
  if (!researchData || !researchData.initialUserMessage) {
    return redirect("/");
  }

  if (!researchData.questions) {
    // Use a single generateObject call with a faster model for better performance
    const startTime = Date.now();
    const result = await generateObject({
      system: dedent(PROMPTS.clarificationPrompt),
      messages: [
        {
          role: "user",
          content: researchData.initialUserMessage,
        },
      ],
      model: togetheraiClient(MODEL_CONFIG.jsonModel), // Faster model
      schema: z.object({
        research_title: z.string(),
        clarifying_questions: z.array(z.string()),
      }),
      maxRetries: 2,
    });
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    console.log(
      `Question generation took ${durationSeconds.toFixed(2)} seconds`
    );

    await db
      .update(research)
      .set({
        title: result.object.research_title,
        questions: result.object.clarifying_questions,
      })
      .where(eq(research.id, researchData.id));

    researchData.title = result.object.research_title;
    researchData.questions = result.object.clarifying_questions;
  }

  return <ChatPage chatId={chatId} researchData={researchData} />;
}
