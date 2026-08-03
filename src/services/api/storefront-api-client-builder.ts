import { ApiClientConfiguration, StorefrontUsersApiClient, ProjectsApiClient, ProductsApiClient } from "@aurigma/axios-storefront-api-client";
import { BaseCCHubApiClientBuilder, IApiClientConfiguration } from "./base-cchub-api-client-builder";
import { inject, injectable } from "tsyringe";
import { CCHubAuth } from "../auth/cchub-auth";
import { CCHubConfiguration } from "../../config/cchub-configuration";
import { Logger } from "winston";

@injectable()
export class StorefrontApiClientBuilder extends BaseCCHubApiClientBuilder {

    constructor(
        @inject("Logger") logger: Logger,
        @inject(CCHubAuth) authService: CCHubAuth,
        @inject(CCHubConfiguration) config: CCHubConfiguration
    ) {
        super(logger, authService, config);
    }

    protected buildClientConfiguration(): IApiClientConfiguration {
        return new ApiClientConfiguration() as IApiClientConfiguration;
    }

    public async buildStorefrontUsersApiClient(): Promise<StorefrontUsersApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new StorefrontUsersApiClient(apiClientConfig);
    }

    public async buildProjectsApiClient(): Promise<ProjectsApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new ProjectsApiClient(apiClientConfig);
    }

    public async buildProductsApiClient(): Promise<ProductsApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new ProductsApiClient(apiClientConfig);
    }
}
