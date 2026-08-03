export const CliExitCode = {
    Success: 0,
    OperationFailed: 1,
    Unexpected: 1,
    Usage: 2,
    Authentication: 3,
    Network: 4,
    Api: 5
} as const;

export type CliExitCodeValue = typeof CliExitCode[keyof typeof CliExitCode];

export class CliError extends Error {
    constructor(
        message: string,
        public readonly exitCode: CliExitCodeValue
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class CliUsageError extends CliError {
    constructor(message: string) {
        super(message, CliExitCode.Usage);
    }
}

export class CliAuthError extends CliError {
    constructor(message: string) {
        super(message, CliExitCode.Authentication);
    }
}

export class CliNetworkError extends CliError {
    constructor(message: string) {
        super(message, CliExitCode.Network);
    }
}

export class CliApiError extends CliError {
    constructor(message: string, public readonly status?: number) {
        super(message, CliExitCode.Api);
    }
}

export class CliOperationError extends CliError {
    public readonly cause?: unknown;

    constructor(message: string, cause?: unknown) {
        super(message, CliExitCode.OperationFailed);
        this.cause = cause;
    }
}

export class CliPartialSuccessError extends CliOperationError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
    }
}

export class CliUnexpectedError extends CliError {
    constructor(message: string) {
        super(message, CliExitCode.Unexpected);
    }
}
