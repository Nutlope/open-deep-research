import { FaGithub, FaTwitter } from "react-icons/fa";

export const Footer = () => {
  return (
    <div className="w-full flex justify-center items-center text-xs text-zinc-400 leading-5 px-4 py-2 bottom-4 fixed left-0 z-50">
      <div className="flex flex-row items-center gap-0">
        <span className="px-3">
          Powered By{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://www.together.ai/models/deepseek-v3-1"
            className="font-semibold hover:text-[#072d77] transition"
          >
            DeepSeek V3.1
          </a>{" "}
          on{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://togetherai.link"
            className="font-semibold hover:text-[#072d77] transition"
          >
            Together AI
          </a>
        </span>
        <span className="h-5 w-px bg-zinc-300 mx-2" />
        <a
          href="https://www.together.ai/blog/open-deep-research"
          target="_blank"
          rel="noreferrer"
          className="hover:text-zinc-600 transition-colors text-xs font-semibold px-3"
        >
          Blog on how it works
        </a>
        <span className="h-5 w-px bg-zinc-300 mx-2" />
        <div className="flex gap-2 items-center px-3">
          <a
            href="https://github.com/Nutlope/open-deep-research"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hover:text-zinc-600 transition-colors font-semibold flex items-center gap-2"
          >
            <FaGithub size={18} />
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  );
};
