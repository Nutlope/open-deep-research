"use client";
import Link from "next/link";
import { useSidebar } from "./ui/sidebar";
import { useUser } from "@clerk/nextjs";

export const Header = () => {
  const { toggleSidebar } = useSidebar();
  const { isSignedIn, isLoaded } = useUser();

  const isUserLoggedIn = isLoaded && isSignedIn;

  return (
    <div className="fixed md:hidden right-0 left-0 w-full top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 z-50">
      <div className="flex justify-center sm:justify-between items-center p-4 ">
        <div className="flex flex-row items-center gap-2 shrink-0 w-full">
          <div className="flex flex-row items-center gap-4 justify-center w-full">
            {isUserLoggedIn && (
              <button
                className="p-1 cursor-pointer absolute left-5"
                onClick={() => {
                  toggleSidebar();
                }}
              >
                <img src="/menu.svg" className="size-5" />
              </button>
            )}
            <Link className="flex flex-row items-center gap-2" href="/">
              <div className="flex flex-row items-center gap-1">
                <div className=" text-zinc-800 dark:text-zinc-100">
                  <img src="/logo.svg" alt="" className="size-6" />
                </div>
                <img
                  src="/logoText.svg"
                  alt="Open Deep Research"
                  className="h-[15px] w-auto"
                />
              </div>
            </Link>
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 shrink-0"></div>
      </div>
    </div>
  );
};
