import {
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
);

export const deepresearchStautsEnum = pgEnum("status", [
  "questions",
  "pending",
  "processing",
  "completed",
]);

export const outputTypeEnum = pgEnum("output_type", ["academic", "smart"]);

export const research = pgTable("chats", {
  id: varchar()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  clerkUserId: varchar(),
  // message prompt from the user in landing page
  initialUserMessage: varchar().notNull(),
  outputType: outputTypeEnum(),
  model: varchar(), // selected model for research
  // generated questions based on the user prompt
  questions: jsonb().$type<string[]>(),
  // answers given from the user or empty array if skipped
  answers: jsonb().$type<string[]>(),
  // research topic
  researchTopic: varchar(),

  researchStartedAt: timestamp(),
  status: deepresearchStautsEnum().notNull().default("questions"),
  title: varchar(), // title of the research extracted from the report markdown
  report: varchar(), // markdown of the report
  completedAt: timestamp(), // timestamp when the research is completed
  coverUrl: varchar(), // url of the cover image generated with flux

  sources: jsonb().$type<
    {
      url: string;
      title: string;
    }[]
  >(), // urls of the sources used to generate the report

  createdAt: timestamp().defaultNow().notNull(),
});
