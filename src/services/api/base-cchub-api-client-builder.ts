import { CCHubAuth } from "../auth/cchub-auth";
import { CCHubConfiguration } from "../../config/cchub-configuration";
import { Logger } from "winston";


export interface IApiClientConfiguration {
    apiUrl: string;
    apiKey: string;
    getAuthorizationToken(): Promise<string>;
    setAuthorizationToken(token: string): void;
}

export abstract class BaseCCHubApiClientBuilder {
    constructor(
        protected readonly logger: Logger,
        protected readonly authService: CCHubAuth,
        private readonly config: CCHubConfiguration
    ) {
        logger.debug("Entered BaseCCHubApiClientBuilder constructor. ", authService, config);
        this.logger = logger;
        this.config = config;
        this.authService = authService;
    }

    /**
     * Get a tenant ID from a current access token.
     * 
     * @returns Tenant ID based on authorized token.
     */
    public getCurrentTenantId() {
        return Number(this.authService.getCurrentTenantId());
    }

    /**
     * Initializes API Client configuration. 
     * 
     * @param scope  Access token scope (i.e. permissions). 
     * @returns An API Configuration object which can be used to init API Clients for all controllers.
     */
    protected async initApiClientConfiguration(scope?: string) {
        const accessToken = await this.authService.getAccessToken(scope);

        const apiClientConfig = this.buildClientConfiguration();
        apiClientConfig.setAuthorizationToken(accessToken);
        apiClientConfig.apiUrl = this.config.apiUrl;

        return apiClientConfig;
    }

    protected abstract buildClientConfiguration(): IApiClientConfiguration;

}
