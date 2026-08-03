import axios, { AxiosError, AxiosResponse } from "axios";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { CCHubConfiguration } from "./cchub-configuration";
import { OAuthLoopbackServer } from "./oauth-loopback-server";
import { StoredAuthSession } from "./token-store";
import { AuthenticationError } from "../utils/errors";

interface OAuthTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
    refresh_token?: string;
}

interface OAuthTokenRequestBody {
    client_id: string;
    grant_type: "authorization_code" | "refresh_token";
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
    refresh_token?: string;
    scope?: string;
}

export interface AuthorizationCodeFlowErrorDetails {
    message: string;
    serverError?: string;
    serverErrorDescription?: string;
    serverResponseBody?: string;
}

export interface PendingAuthorizationCodeLogin {
    authorizationUrl: string;
    openBrowser(): Promise<boolean>;
    complete(): Promise<StoredAuthSession>;
    cancel(): Promise<void>;
}

@injectable()
export class AuthorizationCodeAuth {
    constructor(
        @inject(CCHubConfiguration) private readonly config: CCHubConfiguration,
        @inject(OAuthLoopbackServer) private readonly loopbackServer: OAuthLoopbackServer,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.config = config;
        this.loopbackServer = loopbackServer;
        this.logger = logger;
    }

    public async prepareLogin(): Promise<PendingAuthorizationCodeLogin> {
        if (!this.config.hasAuthorizationCodeConfiguration()) {
            throw new AuthenticationError("Authorization Code flow is not configured. Set CCHUB_AUTHORIZATION_CODE_CLIENTID.");
        }
        if (this.config.authorizationCodeScope.trim().length === 0) {
            throw new AuthenticationError("Authorization Code flow requires CCHUB_AUTHORIZATION_CODE_SCOPE.");
        }

        const state = this.generateRandomString(32, "base64url");
        const codeVerifier = this.generateRandomString(48, "base64url");
        const codeChallenge = this.buildCodeChallenge(codeVerifier);
        const scope = this.config.authorizationCodeScope;
        const loopbackSession = await this.loopbackServer.createSession(
            this.config.authorizationCodeCallbackHost,
            this.config.authorizationCodeCallbackPort,
            this.config.authorizationCodeCallbackPath,
            state
        );

        const authorizationUrl = this.buildAuthorizationUrl({
            clientId: this.config.authorizationCodeClientId,
            redirectUri: loopbackSession.redirectUri,
            state,
            codeChallenge,
            scope
        });

        this.logger.debug("Authorization Code callback redirect URI: %s", loopbackSession.redirectUri);
        this.logger.debug("Authorization Code browser URL: %s", authorizationUrl);

        return {
            authorizationUrl,
            openBrowser: () => this.openBrowser(authorizationUrl),
            complete: async () => {
                try {
                    const code = await loopbackSession.waitForCode();
                    const tokenResponse = await this.exchangeAuthorizationCode({
                        code,
                        codeVerifier,
                        redirectUri: loopbackSession.redirectUri,
                        scope
                    });

                    return this.buildStoredSession(tokenResponse, "authorization_code");
                } catch (error) {
                    await loopbackSession.close();
                    throw error;
                }
            },
            cancel: async () => {
                await loopbackSession.close();
            }
        };
    }

    public async refreshAccessToken(session: StoredAuthSession): Promise<StoredAuthSession> {
        if (session.refreshToken == null || session.refreshToken.trim().length === 0) {
            throw new AuthenticationError("Stored Authorization Code session does not contain a refresh token. Run auth login again.");
        }

        const response = await this.requestToken({
            client_id: this.config.authorizationCodeClientId,
            grant_type: "refresh_token",
            refresh_token: session.refreshToken,
            scope: session.scope
        });

        return this.buildStoredSession(response, "authorization_code", session.refreshToken);
    }

    private async exchangeAuthorizationCode(params: { code: string; codeVerifier: string; redirectUri: string; scope: string; }): Promise<OAuthTokenResponse> {
        return this.requestToken({
            client_id: this.config.authorizationCodeClientId,
            grant_type: "authorization_code",
            code: params.code,
            code_verifier: params.codeVerifier,
            redirect_uri: params.redirectUri,
            scope: params.scope
        });
    }

    private async requestToken(body: OAuthTokenRequestBody): Promise<OAuthTokenResponse> {
        try {
            const response: AxiosResponse<OAuthTokenResponse> = await axios.post(
                this.config.tokenEndpointUrl,
                body,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            );

            return response.data;
        } catch (error) {
            throw this.buildAuthorizationCodeFlowError(error);
        }
    }

    private buildAuthorizationUrl(params: { clientId: string; redirectUri: string; state: string; codeChallenge: string; scope: string; }): string {
        const searchParams = new URLSearchParams({
            response_type: "code",
            client_id: params.clientId,
            redirect_uri: params.redirectUri,
            state: params.state,
            scope: params.scope,
            code_challenge: params.codeChallenge,
            code_challenge_method: "S256",
            response_mode: "query"
        });

        return `${this.config.authorizationEndpointUrl}?${searchParams.toString()}`;
    }

    private buildStoredSession(
        response: OAuthTokenResponse,
        grantType: StoredAuthSession["grantType"],
        fallbackRefreshToken?: string
    ): StoredAuthSession {
        return {
            grantType,
            accessToken: response.access_token,
            expiresAt: new Date(Date.now() + response.expires_in * 1000).toISOString(),
            refreshToken: response.refresh_token ?? fallbackRefreshToken,
            scope: response.scope,
            tokenType: response.token_type
        };
    }

    private buildCodeChallenge(codeVerifier: string): string {
        return createHash("sha256")
            .update(codeVerifier)
            .digest("base64url");
    }

    private generateRandomString(size: number, encoding: BufferEncoding): string {
        return randomBytes(size).toString(encoding);
    }

    private buildAuthorizationCodeFlowError(error: unknown): Error {
        const details = this.extractAuthorizationCodeFlowErrorDetails(error);
        const parts = [details.message];

        if (details.serverError != null) {
            parts.push(`error=${details.serverError}`);
        }
        if (details.serverErrorDescription != null) {
            parts.push(`error_description=${details.serverErrorDescription}`);
        }
        if (details.serverResponseBody != null) {
            parts.push(`response=${details.serverResponseBody}`);
        }

        return new AuthenticationError(parts.join(". "), error);
    }

    private extractAuthorizationCodeFlowErrorDetails(error: unknown): AuthorizationCodeFlowErrorDetails {
        if (!axios.isAxiosError(error)) {
            return {
                message: `Failed to complete Authorization Code flow. Server responded - ${error}`
            };
        }

        const axiosError = error as AxiosError<{
            error?: string;
            error_description?: string;
        }>;
        const responseBody = axiosError.response?.data;
        const serverResponseBody = responseBody == null
            ? undefined
            : typeof responseBody === "string"
                ? responseBody
                : JSON.stringify(responseBody);

        return {
            message: `Failed to complete Authorization Code flow. Server responded - ${axiosError.message}`,
            serverError: responseBody?.error,
            serverErrorDescription: responseBody?.error_description,
            serverResponseBody
        };
    }

    private async openBrowser(url: string): Promise<boolean> {
        try {
            let command: string;
            let args: string[];

            switch (process.platform) {
                case "win32":
                    command = "rundll32.exe";
                    args = ["url.dll,FileProtocolHandler", url];
                    break;
                case "darwin":
                    command = "open";
                    args = [url];
                    break;
                default:
                    command = "xdg-open";
                    args = [url];
                    break;
            }

            const childProcess = spawn(command, args, { detached: true, stdio: "ignore" });

            return await new Promise<boolean>((resolve) => {
                childProcess.once("spawn", () => {
                    childProcess.unref();
                    resolve(true);
                });
                childProcess.once("error", (error) => {
                    this.logger.warn("Failed to open browser automatically. %s", error);
                    resolve(false);
                });
            });
        } catch (error) {
            this.logger.warn("Failed to open browser automatically. %s", error);
            return false;
        }
    }
}
