import { auth } from "@clerk/nextjs/server";
import { togetheraiClientWithKey } from "@/deepresearch/apiClients";
import { generateText } from "ai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

const validateKeyRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(5, "60 s"),
    })
  : null;

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (validateKeyRatelimit) {
    const { success } = await validateKeyRatelimit.limit(userId);
    if (!success) {
      return new Response(
        JSON.stringify({ message: "Too many validation attempts. Try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  const { apiKey } = await request.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ message: "API key is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const customClient = togetheraiClientWithKey(apiKey);
    await generateText({
      model: customClient("moonshotai/Kimi-K2.5"),
      maxOutputTokens: 100,
      messages: [
        {
          role: "user",
          content: "hello",
        },
      ],
    });

    return new Response(JSON.stringify({ message: "API key is valid" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ message: "API key is invalid" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
