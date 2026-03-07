const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;

export function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0B";
    }

    let value = bytes;
    let unitIndex = 0;

    while (value >= 1000 && unitIndex < SIZE_UNITS.length - 1) {
        value /= 1000;
        unitIndex += 1;
    }

    return `${Math.round(value)}${SIZE_UNITS[unitIndex]}`;
}

export function formatByteSize(bytes: number): string {
    return formatFileSize(bytes);
}
