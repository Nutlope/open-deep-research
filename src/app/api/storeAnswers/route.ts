import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { research } from "@/db/schema";
import { eq } from "drizzle-orm";
import { skipQuestions, storeAnswers } from "@/db/action";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { chatId, answers, togetherApiKey } = body;

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: "chatId is required." },
        { status: 400 }
      );
    }

    const [researchEntry] = await db
      .select()
      .from(research)
      .where(eq(research.id, chatId))
      .limit(1);

    if (!researchEntry || researchEntry.clerkUserId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, message: "Invalid answers format." },
        { status: 400 }
      );
    }

    if (answers.length === 0) {
      console.log("Skipping questions for chatId:", chatId);
      await skipQuestions({ chatId, togetherApiKey });
      return NextResponse.json({
        success: true,
        message: "Questions skipped successfully",
      });
    } else {
      console.log("Storing answers for chatId:", chatId);
      await storeAnswers({ chatId, answers, togetherApiKey });
      return NextResponse.json({
        success: true,
        message: "Answers stored successfully",
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500 }
    );
  }
}
