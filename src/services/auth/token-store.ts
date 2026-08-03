import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAppDataDir } from "../../utils/app-data-dir";

export type AuthGrantType = "client_credentials" | "authorization_code";

export interface StoredAuthSession {
    grantType: AuthGrantType;
    accessToken: string;
    expiresAt: string;
    refreshToken?: string;
    scope?: string;
    tokenType?: string;
}

@injectable()
export class TokenStore {
    private static readonly appName = "cchub-cli";
    private static readonly authFileName = "auth.json";

    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    public async load(): Promise<StoredAuthSession | null> {
        const filePath = this.getAuthFilePath();

        try {
            const content = await readFile(filePath, "utf-8");
            const session = JSON.parse(content) as StoredAuthSession;
            this.logger.debug("Loaded auth session from %s.", filePath);

            return session;
        } catch (error) {
            if (this.isFileMissingError(error)) {
                this.logger.debug("Auth session file does not exist yet: %s.", filePath);
                return null;
            }

            throw error;
        }
    }

    public async save(session: StoredAuthSession): Promise<void> {
        const directoryPath = this.getStorageDirectoryPath();
        const filePath = this.getAuthFilePath();

        await mkdir(directoryPath, { recursive: true });
        await writeFile(filePath, JSON.stringify(session, null, 2), "utf-8");

        this.logger.debug("Saved auth session to %s.", filePath);
    }

    public async clear(): Promise<void> {
        const filePath = this.getAuthFilePath();

        try {
            await rm(filePath, { force: true });
            this.logger.debug("Removed auth session file %s.", filePath);
        } catch (error) {
            if (this.isFileMissingError(error)) {
                return;
            }

            throw error;
        }
    }

    public getAuthFilePath(): string {
        return path.join(this.getStorageDirectoryPath(), TokenStore.authFileName);
    }

    private getStorageDirectoryPath(): string {
        return getAppDataDir(TokenStore.appName);
    }

    private isFileMissingError(error: unknown): boolean {
        return typeof error === "object"
            && error !== null
            && "code" in error
            && error.code === "ENOENT";
    }
}
