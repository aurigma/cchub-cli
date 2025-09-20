import { BackOfficeApiClient } from "@aurigma/axios-backoffice-api-client";
import { Logger } from "winston";
import { injectable, inject } from 'tsyringe';

import { CCHubConfiguration } from "./cchub-configuration";
import { CCHubAuth } from "./cchub-auth";

@injectable()
export class CCHubBackOfficeApiService {
    constructor(
        @inject(CCHubConfiguration) private readonly config: CCHubConfiguration,
        @inject(CCHubAuth) private readonly authService: CCHubAuth,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.config = config;
        this.authService = authService;
        this.logger = logger;
    }

    public getCurrentTenantId() {
        return this.authService.getCurrentTenantId();
    }

    public async getPipelines(searchString?: string, skip = null, take = null) {
        const apiClient = await this.initProductsManagementApiClient();
        this.logger.debug("Fetching processing pipelines with search string: ", searchString);
        return apiClient.getAvailableProcessingPipelines(
            skip, // skip
            take, // take
            searchString
        );
    }


    public async getStorefronts(searchString?: string) {
        const apiClient = await this.initStorefrontManagementApiClient();
        this.logger.debug("Fetching storefronts with search string: ", searchString);
        return apiClient.getAll(
            null, // types
            null, // skip
            null, // take
            null, // sorting
            searchString
        );
    }

    private async initStorefrontManagementApiClient(): Promise<BackOfficeApiClient.StorefrontsManagementApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration();

        return new BackOfficeApiClient.StorefrontsManagementApiClient(apiClientConfig);
    }

    private async initProductsManagementApiClient(): Promise<BackOfficeApiClient.ProductsManagementApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration();

        return new BackOfficeApiClient.ProductsManagementApiClient(apiClientConfig);
    }

    /**
     * Initializes API Client configuration. 
     * 
     * @param scope  Access token scope (i.e. permissions). 
     * @returns An API Configuration object which can be used to init API Clients for all controllers.
     */
    private async initApiClientConfiguration(scope?: string) {
        const accessToken = await this.authService.getAccessToken(scope);

        const apiClientConfig = new BackOfficeApiClient.ApiClientConfiguration();
        apiClientConfig.setAuthorizationToken(accessToken);
        apiClientConfig.apiUrl = this.config.apiUrl;

        return apiClientConfig;
    }
}