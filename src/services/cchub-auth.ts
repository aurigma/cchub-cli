import axios, { AxiosResponse } from "axios";
import { CCHubConfiguration } from "./cchub-configuration";
import { Logger } from "winston";
import { jwtDecode } from "jwt-decode";
import { StoredAuthSession, TokenStore } from "./token-store";
import { AuthorizationCodeAuth } from "./authorization-code-auth";

interface AuthClientGrantResponse {
    access_token: string,
    expires_in: number,
    token_type: string,
    scope: string
}

interface AuthClientGrantBody {
    client_id: string,
    client_secret: string,
    grant_type: "client_credentials" | "authorization_code" | "refresh_token",
    scope?: string,
    code?: string,
    code_verifier?: string,
    redirect_uri?: string,
    refresh_token?: string
}

interface DecodedToken {
    client_id: string;
    iss: string;
    aud: string[];
    UserCategory: string;
    TenantId: string;
    UserId: string;
    scope: string[];
}

import { injectable, inject } from 'tsyringe';

@injectable()
export class CCHubAuth {
    private tenantId: string | null;

    constructor(
        @inject(CCHubConfiguration) private config: CCHubConfiguration,
        @inject(AuthorizationCodeAuth) private readonly authorizationCodeAuth: AuthorizationCodeAuth,
        @inject(TokenStore) private readonly tokenStore: TokenStore,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.config = config;
        this.authorizationCodeAuth = authorizationCodeAuth;
        this.logger = logger;
        this.tenantId = null;
        this.tokenStore = tokenStore;
        if (!logger) {
            throw new Error("Logger is required for CCHubAuth");
        }
    }

    /**
      * Returns the access token. During the first call a new token is request, otherwise a cached version is used.   
      * 
      * Refer [Auth docs](https://customerscanvas.com/dev/backoffice/auth.html#requesting-an-access-token-for-the-client-credentials-flow) for details. 
      * 
      * @param scope Access token scope (i.e. permissions). If omitted, retrieves the token for max allowed permissions. Refer Discovery document for available values (see the Auth article).
      * @returns An access token for a specific Client Credentials configured in Customer's Canvas.
      */
    public async getAccessToken(scope?: string): Promise<string> {
        const session = await this.tokenStore.load();

        if (session != null && !this.isTokenExpired(session)) {
            this.ensureSupportedTokenType(session.tokenType);
            this.updateTenantId(session.accessToken);
            this.logger.debug("Using persisted access token. Expires at %s.", session.expiresAt);

            return session.accessToken;
        }

        if (session?.grantType === "authorization_code") {
            this.logger.info("Stored Authorization Code session is expired. Trying to refresh it.");
            const refreshedSession = await this.authorizationCodeAuth.refreshAccessToken(session);
            this.ensureSupportedTokenType(refreshedSession.tokenType);
            await this.tokenStore.save(refreshedSession);
            this.updateTenantId(refreshedSession.accessToken);

            return refreshedSession.accessToken;
        }

        if (!this.config.hasClientCredentialsConfiguration()) {
            throw new Error("No valid persisted session found and Client Credentials flow is not configured. Run auth login or configure Client Credentials.");
        }

        this.logger.info("Recognized than a new access token is required.");
        const tokenResponse = await this.requestAccessToken(scope);
        this.ensureSupportedTokenType(tokenResponse.token_type);

        const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();
        const nextSession: StoredAuthSession = {
            grantType: "client_credentials",
            accessToken: tokenResponse.access_token,
            expiresAt,
            scope: tokenResponse.scope,
            tokenType: tokenResponse.token_type
        };

        await this.tokenStore.save(nextSession);
        this.updateTenantId(tokenResponse.access_token);

        this.logger.info("Updated token for tenant %s. Expires at %s (in %s seconds)", this.tenantId, expiresAt, tokenResponse.expires_in);

        return tokenResponse.access_token;
    }

    public getCurrentTenantId() {
        return this.tenantId;
    }

    private isTokenExpired(session: StoredAuthSession) {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const millisecondsBeforeExpiration = expiresAt.valueOf() - now.valueOf();
        const isExpired = (millisecondsBeforeExpiration / 1000) < this.config.tokenRefreshTimeBeforeExpirationSec;

        this.logger.debug("Seconds before token expiration: %d %s", millisecondsBeforeExpiration / 1000, isExpired ? "(expired)" : "(valid)");

        return isExpired;
    }

    /**
     * Receives Customer's Canvas access token through OAuth2 Client Credentials flow.
     * 
     * @param scope Access token scope (i.e. permissions). If omitted, retrieves the token for max allowed permissions. Refer Discovery document for available values (see the Auth article).
     * @returns 
     */
    private async requestAccessToken(scope?: string): Promise<AuthClientGrantResponse> {
        try {
            const response: AxiosResponse<AuthClientGrantResponse> = await axios.post(
                this.config.tokenEndpointUrl,
                this.buildClientCredentialsAuthRequestBody(scope),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            );

            return response.data;

        } catch (e) {
            throw new Error(`Failed to authenticate. Server responded - ${e}`);
        }

    }

    /**
     * Prepares a request body for the /connect/token endpoint for Client Credentials flow. 
     * 
     * @param scope Access token scope (i.e. permissions). If omitted, retrieves the token for max allowed permissions. Refer Discovery document for available values (see the Auth article).
     * @returns 
     */
    private buildClientCredentialsAuthRequestBody(scope?: string): AuthClientGrantBody {
        if (!this.config.hasClientCredentialsConfiguration()) {
            throw new Error("Client Credentials flow is not configured. Set CCHUB_CLIENT_CREDENTIALS_CLIENTID and CCHUB_CLIENT_CREDENTIALS_CLIENTSECRET.");
        }

        const body: AuthClientGrantBody = {
            client_id: this.config.clientCredentialsClientId,
            client_secret: this.config.clientCredentialsClientSecret,
            grant_type: "client_credentials"
        };

        if (scope != null) {
            body.scope = scope;
        }

        return body;
    }

    private updateTenantId(accessToken: string) {
        const decodedToken = jwtDecode<DecodedToken>(accessToken);
        this.tenantId = decodedToken.TenantId;
    }

    private ensureSupportedTokenType(tokenType?: string) {
        if (tokenType == null || tokenType.toLowerCase() === "bearer") {
            return;
        }

        throw new Error(`Unsupported token type: ${tokenType}`);
    }
}
