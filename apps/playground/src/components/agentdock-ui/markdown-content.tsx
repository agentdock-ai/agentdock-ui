import { useArtifacts } from "./artifact-context";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeUrl } from "./utils";
export function MarkdownContent({ text }: { text: string }) {
  const artifacts = useArtifacts();
  return (
    <div className="min-w-0 space-y-3 text-[14px] leading-[1.7] text-foreground [overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => safeUrl(url) ?? ""}
        components={{
          h1: ({ children }) => (
            <h2 className="mb-2 mt-7 text-[16px] font-semibold leading-6 tracking-tight">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-6 text-[15px] font-semibold leading-6 tracking-tight">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 mt-5 text-[14px] font-semibold leading-6">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-2.5">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-muted-foreground/70">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 list-decimal space-y-1.5 pl-5 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-border pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                onClick={(event) => {
                  if (
                    artifacts?.options.links === "panel" &&
                    event.button === 0 &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey &&
                    artifacts.openLink(href)
                  )
                    event.preventDefault();
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm font-medium underline decoration-muted-foreground/40 decoration-1 underline-offset-[3px] transition-colors duration-150 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt, src }) => (
            <span className="text-[13px] text-muted-foreground">
              {typeof src === "string" && safeUrl(src) ? (
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-muted-foreground/40 underline-offset-[3px] hover:decoration-foreground"
                >
                  {alt || "View image"}
                </a>
              ) : (
                alt || "Image unavailable"
              )}
            </span>
          ),
          pre: ({ children }) => (
            <pre
              tabIndex={0}
              aria-label="Code block"
              className="my-4 max-w-full overflow-x-auto rounded-xl border border-border/70 bg-muted/40 px-4 py-3 font-mono text-[12.5px] leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0 [&>code]:[font-size:inherit]"
            >
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="rounded-md bg-muted px-[0.35em] py-[0.15em] font-mono text-[0.86em]">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div
              tabIndex={0}
              role="region"
              aria-label="Table"
              className="my-4 max-w-full overflow-x-auto rounded-xl border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <table className="w-full border-collapse text-left text-[13px] leading-5 [&_tr:last-child>td]:border-b-0">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-border bg-muted/50 px-4 py-2.5 text-[12px] font-medium text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/70 px-4 py-2.5 align-top">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-border/70" />,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
