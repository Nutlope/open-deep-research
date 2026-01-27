import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Function to clean markdown to pure text
export function cleanMarkdownToText(markdownText: string | undefined): string {
  if (!markdownText) {
    return "";
  }

  let cleanText = markdownText;

  // Remove headers
  cleanText = cleanText.replace(/^#+\s/gm, "");

  // Remove bold and italics
  cleanText = cleanText.replace(/(\*\*|__)(.*?)\1/g, "$2");
  cleanText = cleanText.replace(/(\*|_)(.*?)\1/g, "$2");

  // Remove links, keeping only the link text
  cleanText = cleanText.replace(/\[(.*?)\]\(.*?\)/g, "$1");

  // Remove images, keeping only the alt text
  cleanText = cleanText.replace(/!\[(.*?)\]\(.*?\)/g, "$1");

  // Remove blockquotes
  cleanText = cleanText.replace(/^>\s/gm, "");

  // Remove list markers
  cleanText = cleanText.replace(/^(\s*)[-*+]\s/gm, "$1");
  cleanText = cleanText.replace(/^(\s*)\d+\.\s/gm, "$1");

  // Remove horizontal rules
  cleanText = cleanText.replace(/^-{3,}\s*$/gm, "");
  cleanText = cleanText.replace(/^\*{3,}\s*$/gm, "");
  cleanText = cleanText.replace(/^__{3,}\s*$/gm, "");

  // Remove code blocks
  cleanText = cleanText.replace(/```[\s\S]*?```/g, "");
  cleanText = cleanText.replace(/`([^`]+)`/g, "$1");

  // Remove extra whitespace and newlines
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  return cleanText;
}

/**
 * Extracts all headings (h1, h2, h3) from markdown text.
 * Returns an array of objects: { level: number, text: string }
 */
export function extractMarkdownHeadings(
  markdownText: string
): Array<{ level: number; text: string }> {
  if (!markdownText) return [];
  
  // More robust regex that handles various markdown heading formats
  // Matches headings like: # Heading, ## Heading, ### Heading
  const headingRegex = /^(#{1,3})\s+(.+?)(?:\s*)$/gm;
  const headings: Array<{ level: number; text: string }> = [];
  let match;
  
  while ((match = headingRegex.exec(markdownText)) !== null) {
    const level = match[1].length;
    if (level >= 1 && level <= 3) {
      // Clean the text by trimming whitespace and removing any trailing markdown artifacts
      let text = match[2].trim();
      // Remove any trailing hashes that might be part of the heading in some markdown formats
      text = text.replace(/\s*#+\s*$/, '').trim();
      // Remove markdown bold markers
      text = text.replace(/\*\*(.*?)\*\*/g, '$1');
      headings.push({ level, text });
    }
  }
  
  return headings;
}

// Slugify function to create a short, valid filename
export function slugifyFilename(str: string, maxLength = 24): string {
  return (
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, maxLength) || "report"
  );
}

export const TOGETHER_LINK = "https://togetherai.link/";

// Compress prompt by removing extra whitespace
export function compressPrompt(prompt: string): string {
  return prompt
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ');
}

// Helper to parse slug from URL
export function parseSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const slug = pathname.split("/").pop() || "";
    return slug.replace(/-/g, " ").replace(/_/g, " ");
  } catch {
    return "";
  }
}
