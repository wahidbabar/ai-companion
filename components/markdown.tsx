"use client";

import React, { memo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A code block with its own framed container and a copy button.
 * highlight.js (via rehype-highlight) colors the tokens; this owns the frame.
 */
function CodeBlock({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const text = ref.current?.innerText ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/code relative my-3">
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 z-10 rounded-md border border-white/10 bg-black/40 p-1.5 text-zinc-400 opacity-0 backdrop-blur transition hover:text-zinc-100 group-hover/code:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <pre
        ref={ref}
        className="overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4 text-[13px] leading-relaxed text-zinc-200"
      >
        {children}
      </pre>
    </div>
  );
}

const components: Components = {
  a: ({ node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand underline underline-offset-2 transition hover:opacity-80"
    />
  ),
  p: ({ node, ...props }) => (
    <p {...props} className="leading-7 [&:not(:first-child)]:mt-3" />
  ),
  ul: ({ node, ...props }) => (
    <ul
      {...props}
      className="my-3 ml-5 list-disc space-y-1.5 marker:text-muted-foreground"
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      {...props}
      className="my-3 ml-5 list-decimal space-y-1.5 marker:text-muted-foreground"
    />
  ),
  li: ({ node, ...props }) => <li {...props} className="leading-7" />,
  h1: ({ node, ...props }) => (
    <h1 {...props} className="mb-2 mt-5 text-xl font-semibold tracking-tight" />
  ),
  h2: ({ node, ...props }) => (
    <h2 {...props} className="mb-2 mt-5 text-lg font-semibold tracking-tight" />
  ),
  h3: ({ node, ...props }) => (
    <h3 {...props} className="mb-2 mt-4 text-base font-semibold tracking-tight" />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      {...props}
      className="my-3 border-l-2 border-brand/60 pl-4 italic text-muted-foreground"
    />
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table {...props} className="w-full border-collapse text-sm" />
    </div>
  ),
  th: ({ node, ...props }) => (
    <th
      {...props}
      className="border border-border bg-secondary px-3 py-1.5 text-left font-medium"
    />
  ),
  td: ({ node, ...props }) => (
    <td {...props} className="border border-border px-3 py-1.5" />
  ),
  code: ({ node, className, children, ...props }) => {
    // Block code is wrapped in <pre> and tagged with a language- class by
    // rehype-highlight; inline code has neither, so we style it as a chip.
    const isBlock = /language-|hljs/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={cn(className, "font-mono")} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ node, children }) => <CodeBlock>{children}</CodeBlock>,
};

/**
 * Renders an assistant message as GitHub-flavored markdown.
 * Memoized so re-renders during token streaming stay cheap.
 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[15px] text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
