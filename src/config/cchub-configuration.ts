import { injectable } from 'tsyringe';

@injectable()
export class CCHubConfiguration {
    private static readonly defaultAuthorizationCodeScopes = ["openid", "profile", "offline_access", "email"] as const;

    public readonly baseUrl: string;
    public readonly apiUrl: string;
    public readonly authorizationCodeClientId: string;
    public readonly authorizationCodeResourceScope: string;
    public readonly authorizationCodeCallbackHost: string;
    public readonly authorizationCodeCallbackPort: number | null;
    public readonly authorizationCodeCallbackPath: string;
    public readonly clientCredentialsClientId: string;
    public readonly clientCredentialsClientSecret: string;
    public readonly tenantId: number;

    public readonly tokenRefreshTimeBeforeExpirationSec: number;


    constructor() {
        this.baseUrl = process.env["CCHUB_BASEURL"] ?? "https://customerscanvashub.com";
        this.apiUrl = this.baseUrl.replace("://", "://api.");
        this.authorizationCodeClientId = process.env["CCHUB_AUTHORIZATION_CODE_CLIENTID"] ?? "";
        this.authorizationCodeResourceScope = process.env["CCHUB_AUTHORIZATION_CODE_SCOPE"] ?? "";
        this.authorizationCodeCallbackHost = process.env["CCHUB_AUTHORIZATION_CODE_CALLBACK_HOST"] ?? "127.0.0.1";
        this.authorizationCodeCallbackPort = this.readOptionalPort(process.env["CCHUB_AUTHORIZATION_CODE_CALLBACK_PORT"]);
        this.authorizationCodeCallbackPath = process.env["CCHUB_AUTHORIZATION_CODE_CALLBACK_PATH"] ?? "/oauth/callback";
        this.clientCredentialsClientId = process.env["CCHUB_CLIENT_CREDENTIALS_CLIENTID"] ?? "";
        this.clientCredentialsClientSecret = process.env["CCHUB_CLIENT_CREDENTIALS_CLIENTSECRET"] ?? "";
        this.tenantId = Number(process.env["CCHUB_TENANTID"]);
        this.tokenRefreshTimeBeforeExpirationSec = Number(process.env["CCHUB_TOKENREFRESTIMEBEFOREEXPIRATIONSEC"] ?? 60);
    }

    public hasAuthorizationCodeConfiguration(): boolean {
        return this.authorizationCodeClientId.trim().length > 0;
    }

    public hasClientCredentialsConfiguration(): boolean {
        return this.clientCredentialsClientId.trim().length > 0
            && this.clientCredentialsClientSecret.trim().length > 0;
    }

    public get authorizationEndpointUrl(): string {
        return `${this.baseUrl}/connect/authorize`;
    }

    public get tokenEndpointUrl(): string {
        return `${this.baseUrl}/connect/token`;
    }

    public get authorizationCodeScope(): string {
        const scopes = new Set<string>(CCHubConfiguration.defaultAuthorizationCodeScopes);

        for (const scope of this.authorizationCodeResourceScope.split(/\s+/)) {
            const normalizedScope = scope.trim();
            if (normalizedScope.length > 0) {
                scopes.add(normalizedScope);
            }
        }

        return Array.from(scopes).join(" ");
    }

    private readOptionalPort(value?: string): number | null {
        if (value == null || value.trim().length === 0) {
            return null;
        }

        const port = Number(value);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error("CCHUB_AUTHORIZATION_CODE_CALLBACK_PORT must be an integer between 1 and 65535.");
        }

        return port;
    }
}
