"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getChats } from "@/lib/getChats";
import { ApiKeyControls } from "@/components/app/ApiKeyControls";
import { TOGETHER_LINK } from "@/lib/utils";

type Chat = Awaited<ReturnType<typeof getChats>>[number];

async function fetchChats(): Promise<Chat[]> {
  const res = await fetch("/api/chats");
  if (!res.ok) {
    // Handle error, maybe throw or return empty array
    console.error("Failed to fetch chats");
    return [];
  }
  return res.json();
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { isSignedIn, isLoaded } = useUser();

  const isUserLoggedIn = isLoaded && isSignedIn;

  useEffect(() => {
    if (!isUserLoggedIn) return;

    const fetchAndSetChats = async () => {
      const chatsData = await fetchChats();
      setChats(chatsData);
      setIsLoading(false);
    };

    fetchAndSetChats();
  }, [pathname, isUserLoggedIn]);

  if (!isUserLoggedIn) {
    return <></>;
  }

  return (
    <Sidebar className="print:hidden">
      <SidebarHeader className="pt-5 px-5">
        <div className="flex flex-row justify-between items-center pb-6">
          <div className="flex flex-row gap-2.5 items-center">
            <Link className="flex flex-row items-center gap-2" href="/">
              <div className="flex flex-row items-center gap-1">
                <img
                  src="/logo.svg"
                  alt="Open Deep Research"
                  className="size-6"
                />

                <img
                  src="/logoText.svg"
                  alt="Open Deep Research"
                  className="h-[15px] w-auto"
                />
              </div>
            </Link>
            <svg
              width="1"
              height="15"
              viewBox="0 0 1 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0.25 0L0.250001 15"
                stroke="#D4D4D4"
                strokeWidth="0.5"
              />
            </svg>
            <a href={TOGETHER_LINK} target="_blank" rel="noreferrer">
              <img src="/madeBy.png" className="h-[18px] min-w-[63px]" />
            </a>
          </div>
          <button
            className="p-1 cursor-pointer md:hidden"
            onClick={() => {
              toggleSidebar();
            }}
          >
            <img src="/menu.svg" className="size-5" />
          </button>
        </div>
        <SidebarMenuButton asChild>
          <button
            onClick={() => {
              setOpenMobile(false);
              router.push("/");
            }}
            className="flex justify-center items-center w-full h-10 relative gap-1.5 px-4 py-1.5 rounded !bg-[#dce8ff] border border-[#072d77] cursor-pointer "
          >
            <svg
              width={11}
              height={12}
              viewBox="0 0 11 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-grow-0 flex-shrink-0"
              preserveAspectRatio="none"
            >
              <path
                d="M5.5 1V11M10.5 6H0.5"
                stroke="#072D77"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="flex-grow-0 flex-shrink-0 text-base font-medium text-left text-[#072d77]">
              New Report
            </p>
          </button>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-col gap-3 px-5 mt-5">
          <div className="text-xs font-medium text-left text-[#99a1af]">
            Your reports
          </div>

          {isLoading ? (
            <>
              {[...Array(5)].map((_, index) => (
                <div key={index} className="p-2 h-8">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </>
          ) : (
            chats.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`;
              return (
                <SidebarMenuButton isActive={isActive} asChild key={chat.id}>
                  <Link
                    onClick={() => setOpenMobile(false)}
                    href={`/chat/${chat.id}`}
                    className={`text-base text-left overflow-hidden ${
                      isActive
                        ? " text-[#1e2939] !font-medium"
                        : "text-[#4a5565]"
                    }`}
                  >
                    <span className="truncate">
                      {chat.title || chat.initialUserMessage}
                    </span>
                  </Link>
                </SidebarMenuButton>
              );
            })
          )}
          {chats.length === 0 && !isLoading && (
            <p className="text-base text-left text-[#4a5565]">No chats yet.</p>
          )}
        </div>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <ApiKeyControls />
        <div className="flex flex-row items-center gap-2 px-5 pt-3 border-t border-t-[#E5E7EB]">
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  userButtonBox: {
                    flexDirection: "row-reverse",
                  },
                },
              }}
              showName
            />
          </SignedIn>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
