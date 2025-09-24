import { BackOfficeApiClient } from "@aurigma/axios-backoffice-api-client";
import { BaseCCHubApiClientBuilder, IApiClientConfiguration } from "./base-cchub-api-client-builder";
import { inject, injectable } from "tsyringe";
import { CCHubAuth } from "./cchub-auth";
import { CCHubConfiguration } from "./cchub-configuration";
import { Logger } from "winston";

@injectable()
export class BackOfficeApiClientBuilder extends BaseCCHubApiClientBuilder {

    constructor(
        @inject("Logger") logger: Logger,
        @inject(CCHubAuth) authService: CCHubAuth,
        @inject(CCHubConfiguration) config: CCHubConfiguration
    ) {
        super(logger, authService, config);
    }

    protected buildClientConfiguration(): IApiClientConfiguration {
        return new BackOfficeApiClient.ApiClientConfiguration() as IApiClientConfiguration;
    }

    public async buildStorefrontManagementApiClient(): Promise<BackOfficeApiClient.StorefrontsManagementApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as BackOfficeApiClient.ApiClientConfiguration;

        return new BackOfficeApiClient.StorefrontsManagementApiClient(apiClientConfig);
    }

    public async buildProductsManagementApiClient(): Promise<BackOfficeApiClient.ProductsManagementApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as BackOfficeApiClient.ApiClientConfiguration;

        return new BackOfficeApiClient.ProductsManagementApiClient(apiClientConfig);
    }
}