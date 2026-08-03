export class NotImplementedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotImplementedError";
    }
}

export class AuthenticationError extends Error {
    public readonly cause?: unknown;

    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = "AuthenticationError";
        this.cause = cause;
    }
}
