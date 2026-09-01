const TOOLS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Perplexity",
  "Midjourney",
  "n8n",
  "GitHub Copilot",
  "NotebookLM",
  "Runway",
];

/**
 * Duplicated once so the CSS animation can scroll a continuous strip and
 * loop seamlessly at -50% rather than snapping back to the start.
 */
const ITEMS = [...TOOLS, ...TOOLS];

export function ToolsMarquee() {
  return (
    <div className="overflow-hidden border-y border-border bg-surface-muted/40 py-6">
      <div className="marquee-track flex w-max items-center gap-10">
        {ITEMS.map((tool, index) => (
          <span
            key={`${tool}-${index}`}
            className="text-sm font-medium tracking-wide text-muted"
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}
