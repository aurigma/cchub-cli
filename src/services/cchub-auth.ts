import axios, { AxiosResponse } from "axios";
import { CCHubConfiguration } from "./cchub-configuration";
import { Logger } from "winston";
import { jwtDecode } from "jwt-decode";

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
    private token: string | null;
    private expires_at: Date;
    private tenantId: string | null;

    constructor(
        @inject(CCHubConfiguration) private config: CCHubConfiguration,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.config = config;
        this.token = null;
        this.expires_at = new Date();
        this.logger = logger;
        this.tenantId = null;
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
        if (this.token == null || this.isTokenExpired()) {
            this.logger.info("Recognized than a new access token is required.");
            const { access_token, expires_in } = await this.requestAccessToken(scope);
            this.token = access_token;

            const decodedToken = jwtDecode<DecodedToken>(access_token);
            this.tenantId = decodedToken.TenantId;
            this.expires_at = new Date(this.expires_at.setSeconds(expires_in));

            this.logger.info("Updated token for tenant %s. Expires at %s (in %s seconds)", this.tenantId, this.expires_at, expires_in);
        }

        return this.token;
    }

    public getCurrentTenantId() {
        return this.tenantId;
    }

    private isTokenExpired() {
        const now = new Date();
        const millisecondsBeforeExpiration = this.expires_at.valueOf() - now.valueOf();
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
        const authUrl = `${this.config.baseUrl}/connect/token`;
        scope = undefined;

        try {
            const response: AxiosResponse<AuthClientGrantResponse> = await axios.post(
                authUrl,
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
        const body: AuthClientGrantBody = {
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: "client_credentials"
        };

        if (scope != null) {
            body.scope = scope;
        }

        return body;
    }
}