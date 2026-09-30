/** Demo limits belong to this app. Hosts can support other formats in their own adapter. */
export const playgroundAttachmentPolicy = {
  accept:
    "text/*,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.yaml,.yml,.toml,.log,image/png,image/jpeg,image/webp,image/gif",
  maxFiles: 5,
  maxFileSize: 5_000_000,
};
