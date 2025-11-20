"use server";
import { db } from "@/db";
import { getResearch } from "@/db/action";
import { research } from "@/db/schema";
import { StartResearchPayload } from "@/deepresearch/workflows/start-research-workflow";
import { qstash, workflow } from "@/lib/clients";
import { eq } from "drizzle-orm";
import { limitResearch } from "@/lib/limits";

export const startResearch = async ({
  chatId,
  personalTogetherApiKey,
}: {
  chatId: string;
  personalTogetherApiKey?: string;
}) => {
  console.log("startResearch", chatId);

  const researchData = await getResearch(chatId);

  if (!researchData || !researchData.clerkUserId) {
    throw new Error("Research with clerk user not found");
  }

  const { success } = await limitResearch({
    clerkUserId: researchData?.clerkUserId,
    isBringingKey: !!personalTogetherApiKey,
  });

  if (!success) {
    throw new Error("No remaining researches");
  }

  // Get the base URL for the workflow
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

  const workflowUrl = `${baseUrl}/api/workflows/nested-research/start-research`;

  const researchTopic = `${researchData?.initialUserMessage} ${
    researchData?.answers && researchData?.answers?.length > 0
      ? researchData?.questions
          ?.map((question, questionIdx) => {
            const answer = researchData?.answers?.[questionIdx];
            return answer ? `${questionIdx + 1}. ${question} ${answer}` : "";
          })
          .filter(Boolean)
          .join(" ")
      : ""
  }`.trim();

  await db
    .update(research)
    .set({
      researchTopic,
      researchStartedAt: new Date(),
    })
    .where(eq(research.id, chatId))
    .returning();

  const payload: StartResearchPayload = {
    topic: researchTopic,
    sessionId: chatId,
    togetherApiKey: personalTogetherApiKey,
    outputType: researchData.outputType,
  };

  // generate researchTopic by joining strings with:initialUserMessage + questions+answers the complete researchTopic to use in the research

  const { workflowRunId } = await workflow.trigger({
    url: workflowUrl,
    body: JSON.stringify(payload),
    retries: 3, // Optional retries for the initial request
  });

  // Schedule a cancel request to the cancel endpoint after 15 minutes
  await qstash.publishJSON({
    url: `${baseUrl}/api/cancel`,
    body: { id: workflowRunId },
    // delay of 15 minutes
    delay: 15 * 60 * 1000,
  });

  console.log(
    "Started research with ID:",
    chatId + " WfId:" + workflowRunId + " 🔎:" + researchTopic
  );

  if (!workflowRunId)
    throw new Error("No workflow run ID returned from Trigger");

  return {
    researchId: research.id,
    status: research.status,
    createdAt: research.createdAt,
  };
};
