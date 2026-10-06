import { InvalidArgumentError } from "commander";

export function parseNonNegativeNumber(value: string): number {
    const normalized = value.trim();
    const parsed = Number(normalized);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)
        || !Number.isFinite(parsed) || parsed < 0) {
        throw new InvalidArgumentError("Expected a finite non-negative number (use a dot for decimals).");
    }
    return parsed;
}

export function parseInteger(value: string): number {
    const normalized = value.trim();
    const parsed = Number(normalized);

    if (!/^-?\d+$/.test(normalized) || !Number.isSafeInteger(parsed)) {
        throw new InvalidArgumentError(`Expected an integer, received "${value}".`);
    }

    return parsed;
}

export function parseNonNegativeInteger(value: string): number {
    const parsed = parseInteger(value);

    if (parsed < 0) {
        throw new InvalidArgumentError("Expected a non-negative integer.");
    }

    return parsed;
}

export function parsePositiveInteger(value: string): number {
    const parsed = parseInteger(value);

    if (parsed <= 0) {
        throw new InvalidArgumentError("Expected a positive integer.");
    }

    return parsed;
}

export function parseNonEmptyString(value: string): string {
    const parsed = value.trim();

    if (parsed.length === 0) {
        throw new InvalidArgumentError("Value cannot be empty.");
    }

    return parsed;
}

export function parseCommaSeparatedList(value: string): string[] {
    const items = value.split(",").map(item => item.trim());

    if (items.length === 0 || items.some(item => item.length === 0)) {
        throw new InvalidArgumentError("Expected a comma-separated list of non-empty values.");
    }

    return items;
}
