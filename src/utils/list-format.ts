export const LIST_FORMATS = ["table", "json", "yaml", "csv"] as const;
export type ListFormat = typeof LIST_FORMATS[number];
