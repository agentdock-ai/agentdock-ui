export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}
export function uploadResponse(value: unknown): UploadedFile {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !value.id ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    !value.name ||
    !("size" in value) ||
    typeof value.size !== "number" ||
    !Number.isSafeInteger(value.size) ||
    value.size < 0 ||
    !("mimeType" in value) ||
    typeof value.mimeType !== "string" ||
    !value.mimeType
  )
    throw new Error("The upload could not be confirmed.");
  return {
    id: value.id,
    name: value.name,
    size: value.size,
    mimeType: value.mimeType,
  };
}
export function responseError(value: unknown, fallback: string): string {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string" &&
    value.error.trim()
  )
    return value.error;
  return fallback;
}
