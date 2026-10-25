import { useEffect, useState } from "react";
/** Blob URLs belong only to this mounted viewer and are always revoked. */
export function useArtifactUrl(content: string | undefined, mimeType: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (content === undefined) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(new Blob([content], { type: mimeType }));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [content, mimeType]);
  return url;
}
