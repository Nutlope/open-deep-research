import { cn, TOGETHER_LINK } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

export const LandingHero = () => {
  const { isSignedIn, user, isLoaded } = useUser();

  const isAuthenticated = isSignedIn && !!user;

  if (!isLoaded) {
    return (
      <>
        <div className="w-[180px] h-9 rounded bg-gray-200 animate-pulse mb-8 mt-2" />
        <div className="flex flex-col gap-4 w-full animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-5 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
        <div className="w-40 h-12 bg-gray-200 rounded-lg animate-pulse mb-4 mt-8" />
        <div className="h-[240px] bg-gray-200 w-full rounded-lg animate-pulse" />
      </>
    );
  }

  return (
    <>
      <a
        href={TOGETHER_LINK}
        target="_blank"
        rel="noreferrer"
        className="w-[180px] relative items-center justify-center rounded bg-gray-50 border border-gray-200 flex flex-row gap-1 px-4 py-2"
      >
        <div className="text-xs text-[#6A7282] whitespace-nowrap">
          Powered by
        </div>
        <img
          src="/together.png"
          className="w-[77.3px] h-[12.94px] mt-0.5 object-fill"
          alt="Together.ai logo"
        />
      </a>

      <div
        className={cn(
          isAuthenticated ? "mb-8" : "mb-6",
          "flex flex-col gap-4 w-full"
        )}
      >
        <p className="text-[32px] md:text-[40px] font-medium text-center text-[#1e2939] font-serif">
          {!isAuthenticated ? (
            <>Reports with Open Deep Research</>
          ) : (
            <>Welcome Back, {user.firstName || user.fullName || "Researcher"}</>
          )}
        </p>
        {!isAuthenticated && (
          <p className="mx-auto max-w-[364px] text-base text-center text-[#6a7282]">
            Have AI do research for you, refine your ideas, and turn every
            question into a meaningful report
          </p>
        )}
      </div>
    </>
  );
};
