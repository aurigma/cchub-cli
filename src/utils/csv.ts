export type CsvColumn<T> = Extract<keyof T, string> | {
    header: string;
    value: (row: T) => unknown;
};

export function stringifyCsv<T extends object>(
    rows: readonly T[],
    columns?: readonly CsvColumn<T>[]
): string {
    const fields = columns ?? [...new Set(rows.flatMap(row => Object.keys(row)))] as Extract<keyof T, string>[];
    const headers = fields.map(field => typeof field === "string" ? field : field.header);
    const body = rows.map(row => toCsvLine(fields.map(field =>
        formatCsvValue(typeof field === "string" ? row[field] : field.value(row))
    )));
    return [toCsvLine(headers), ...body].join("\n");
}

function formatCsvValue(value: unknown): string {
    if (value == null) return "";
    if (Array.isArray(value)) {
        return value.map(formatCsvValue).join(", ");
    }
    if (typeof value === "object") {
        return Object.entries(value).map(([key, entry]) => `${key}=${formatCsvValue(entry)}`).join(", ");
    }
    return String(value);
}

function toCsvLine(values: readonly string[]): string {
    return values.map(value => /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value).join(",");
}

export function parseCsvToObjects(content: string): Array<Record<string, string>> {
    const rows = parseCsv(content);
    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0].map(x => x.trim());
    const hasHeaders = headers.some(x => x.length > 0);
    if (!hasHeaders) {
        return [];
    }

    const items: Array<Record<string, string>> = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const isEmptyRow = row.every(value => value.trim().length === 0);
        if (isEmptyRow) {
            continue;
        }

        const entry: Record<string, string> = {};
        for (let col = 0; col < headers.length; col++) {
            const header = headers[col];
            if (!header) {
                continue;
            }
            entry[header] = row[col] ?? "";
        }
        items.push(entry);
    }

    return items;
}

function parseCsv(content: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;

    const addCell = () => {
        row.push(cell);
        cell = "";
    };

    const addRow = () => {
        addCell();
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];

        if (ch === "\"") {
            if (inQuotes && content[i + 1] === "\"") {
                cell += "\"";
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === "," && !inQuotes) {
            addCell();
            continue;
        }

        if ((ch === "\n" || ch === "\r") && !inQuotes) {
            if (ch === "\r" && content[i + 1] === "\n") {
                i++;
            }
            addRow();
            continue;
        }

        cell += ch;
    }

    const hasTailData = inQuotes || cell.length > 0 || row.length > 0;
    if (hasTailData) {
        addRow();
    }

    return rows;
}
