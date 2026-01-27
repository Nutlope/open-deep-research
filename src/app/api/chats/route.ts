import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getChats } from "@/lib/getChats";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const chats = await getChats(userId);
  
  // Clean titles by removing markdown bold markers for backward compatibility
  const cleanedChats = chats.map(chat => ({
    ...chat,
    title: chat.title ? chat.title.replace(/\*\*(.*?)\*\*/g, '$1') : chat.title
  }));

  return NextResponse.json(cleanedChats);
}
