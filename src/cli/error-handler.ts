import axios, { AxiosError } from "axios";
import { CommanderError } from "commander";
import { Logger } from "winston";
import {
    CliApiError,
    CliAuthError,
    CliError,
    CliExitCode,
    CliNetworkError,
    CliUnexpectedError,
    CliUsageError
} from "./errors";
import { AuthenticationError } from "../utils/errors";

const networkErrorCodes = new Set([
    "ECONNABORTED",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENETUNREACH",
    "ENOTFOUND",
    "EPIPE",
    "ETIMEDOUT"
]);

const oauthAuthenticationErrors = new Set([
    "access_denied",
    "invalid_client",
    "invalid_grant",
    "login_required",
    "unauthorized_client"
]);

export function handleCliError(error: unknown, logger: Logger): void {
    const cliError = normalizeCliError(error);

    if (cliError.exitCode === CliExitCode.Success) {
        process.exitCode = CliExitCode.Success;
        return;
    }

    const details = formatErrorDetails(error);
    logger.error("CLI command failed: %s", details);

    // Commander has already rendered its own validation message and usage help.
    if (!(error instanceof CommanderError)) {
        console.error(cliError.message);
    }

    process.exitCode = cliError.exitCode;
}

export function normalizeCliError(error: unknown): CliError {
    if (error instanceof CliError) {
        return error;
    }

    if (error instanceof CommanderError) {
        if (error.exitCode === CliExitCode.Success) {
            return new CliError(error.message, CliExitCode.Success);
        }

        return new CliUsageError(error.message);
    }

    const axiosError = findAxiosError(error);
    if (axiosError != null) {
        const status = axiosError.response?.status;

        if (status === 401 || status === 403 || isOAuthAuthenticationError(axiosError)) {
            return new CliAuthError("Authentication or authorization failed.");
        }

        if (axiosError.response == null) {
            return new CliNetworkError("Cannot reach Customer's Canvas API.");
        }

        return new CliApiError(`Customer's Canvas API returned HTTP ${status}.`, status);
    }

    if (error instanceof AuthenticationError) {
        return new CliAuthError(error.message);
    }

    const status = readNumericProperty(error, "status");
    if (status === 401 || status === 403) {
        return new CliAuthError("Authentication or authorization failed.");
    }
    if (status != null) {
        return new CliApiError(`Customer's Canvas API returned HTTP ${status}.`, status);
    }

    const code = readStringProperty(error, "code");
    if (code != null && networkErrorCodes.has(code)) {
        return new CliNetworkError("Cannot reach Customer's Canvas API.");
    }

    const message = error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unexpected error.";
    return new CliUnexpectedError(message);
}

function findAxiosError(error: unknown): AxiosError | null {
    let current = error;

    for (let depth = 0; depth < 5 && current != null; depth += 1) {
        if (axios.isAxiosError(current)) {
            return current;
        }

        current = readUnknownProperty(current, "cause");
    }

    return null;
}

function isOAuthAuthenticationError(error: AxiosError): boolean {
    const data = error.response?.data;
    const oauthError = readStringProperty(data, "error");
    return oauthError != null && oauthAuthenticationErrors.has(oauthError);
}

function readNumericProperty(value: unknown, property: string): number | null {
    const propertyValue = readUnknownProperty(value, property);
    return typeof propertyValue === "number" ? propertyValue : null;
}

function readStringProperty(value: unknown, property: string): string | null {
    const propertyValue = readUnknownProperty(value, property);
    return typeof propertyValue === "string" ? propertyValue : null;
}

function readUnknownProperty(value: unknown, property: string): unknown {
    if (typeof value !== "object" || value == null || !(property in value)) {
        return null;
    }

    return (value as Record<string, unknown>)[property];
}

function formatErrorDetails(error: unknown): string {
    const parts: string[] = [];
    const visited = new Set<unknown>();
    let current = error;

    for (let depth = 0; depth < 5 && current != null && !visited.has(current); depth += 1) {
        visited.add(current);
        parts.push(current instanceof Error ? current.stack ?? current.message : String(current));
        current = readUnknownProperty(current, "cause");
    }

    return parts.join("\nCaused by: ");
}
