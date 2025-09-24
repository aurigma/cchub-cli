import { ApiClientConfiguration, DesignsApiClient, PrivateDesignsApiClient } from "@aurigma/axios-asset-storage-api-client";
import { BaseCCHubApiClientBuilder, IApiClientConfiguration } from "./base-cchub-api-client-builder";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { CCHubAuth } from "./cchub-auth";
import { CCHubConfiguration } from "./cchub-configuration";

@injectable()
export class AssetStorageApiClientBuilder extends BaseCCHubApiClientBuilder {

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

    public async buildPrivateDesignApiClient(): Promise<PrivateDesignsApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new PrivateDesignsApiClient(apiClientConfig);
    }

    public async buildDesignApiClient(): Promise<DesignsApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new DesignsApiClient(apiClientConfig);
    }    
}