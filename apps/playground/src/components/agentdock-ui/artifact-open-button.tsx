import { useArtifacts } from "./artifact-context";
export function ArtifactOpenButton({
  toolCallId,
  showTitle = false,
}: {
  toolCallId: string;
  showTitle?: boolean;
}) {
  const context = useArtifacts();
  const artifact = context?.artifacts.find((a) =>
    a.versions.some((v) => v.toolCallId === toolCallId),
  );
  if (!artifact) return null;
  return (
    <button
      type="button"
      aria-label={`Open ${artifact.title}`}
      onClick={() => context?.open(artifact.id)}
      className="shrink-0 rounded px-2 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      Open{showTitle ? ` ${artifact.title}` : ""}
    </button>
  );
}
