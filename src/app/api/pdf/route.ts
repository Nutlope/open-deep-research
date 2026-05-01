import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import chrome from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { slugifyFilename } from "@/lib/utils";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const BLOCKED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const BLOCKED_IP_PREFIXES = [
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
  "169.254.",
  "100.64.",
  "fc00:",
  "fe80:",
  "::1",
];

function isUrlSafe(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return false;
  }

  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (hostname.startsWith(prefix)) {
      return false;
    }
  }

  return true;
}

function getSafeCorsOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

function setCorsHeaders(headers: Headers, methods?: string) {
  const origin = getSafeCorsOrigin();
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set(
    "Access-Control-Allow-Methods",
    methods || "GET,OPTIONS,POST"
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !body.url) {
    return NextResponse.json({ error: "No url provided" }, { status: 400 });
  }

  const url = String(body.url);

  if (!isUrlSafe(url)) {
    return NextResponse.json(
      { error: "URL is not allowed. Only HTTPS URLs to public hosts are permitted." },
      { status: 403 }
    );
  }

  const isProd = process.env.NODE_ENV === "production";

  let browser;

  try {
    if (isProd) {
      browser = await puppeteer.launch({
        args: [...chrome.args, "--disable-web-security"],
        defaultViewport: chrome.defaultViewport,
        executablePath: await chrome.executablePath(),
        headless: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 600, height: 600 });

    console.log("Navigating to safe URL:", url);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    const fileName = slugifyFilename(body.fileName || "report");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${fileName}.pdf"; filename*=UTF-8''${fileName}.pdf`
    );
    setCorsHeaders(headers);

    return new NextResponse(new Blob([pdf as any]), { status: 200, headers });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function GET(req: NextRequest) {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export async function OPTIONS(req: NextRequest) {
  const headers = new Headers();
  setCorsHeaders(headers);
  return new NextResponse(null, { status: 200, headers });
}
