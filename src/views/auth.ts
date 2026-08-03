import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { StoredAuthSession } from "../services/token-store";

@injectable()
export class AuthView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    public renderStatus(session: StoredAuthSession | null, authFilePath: string, refreshWindowSec: number): void {
        if (session == null) {
            console.log("Authentication status: signed out");
            console.log(`Session file: ${authFilePath}`);
            return;
        }

        const expiresAt = new Date(session.expiresAt);
        const secondsUntilExpiry = Math.floor((expiresAt.valueOf() - Date.now()) / 1000);
        const isExpired = secondsUntilExpiry < refreshWindowSec;

        console.log(`Authentication status: ${isExpired ? "expired" : "signed in"}`);
        console.log(`Grant type: ${session.grantType}`);
        console.log(`Token type: ${session.tokenType ?? "Bearer"}`);
        console.log(`Expires at: ${session.expiresAt}`);
        console.log(`Refresh token: ${session.refreshToken != null ? "present" : "absent"}`);
        console.log(`Session file: ${authFilePath}`);
    }

    public renderLogout(authFilePath: string): void {
        console.log(`Authentication session cleared: ${authFilePath}`);
    }

    public renderLoginStart(authorizationUrl: string, browserOpened: boolean): void {
        if (browserOpened) {
            console.log("Opening browser for interactive login...");
        } else {
            console.log("Open this URL in your browser to continue authentication:");
            console.log(authorizationUrl);
        }
    }

    public renderLoginSuccess(authFilePath: string): void {
        console.log("Authentication completed successfully.");
        console.log(`Session file: ${authFilePath}`);
    }

    public renderLoginError(message: string): void {
        console.error(`Interactive authentication failed: ${message}`);
    }

    public renderError(message: string): void {
        console.error(message);
    }
}
