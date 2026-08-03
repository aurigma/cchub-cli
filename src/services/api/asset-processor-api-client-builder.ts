import { ApiClientConfiguration, DesignProcessorApiClient, PrivateDesignProcessorApiClient, FontProcessorApiClient } from "@aurigma/axios-asset-processor-api-client";
import { BaseCCHubApiClientBuilder, IApiClientConfiguration } from "./base-cchub-api-client-builder";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { CCHubAuth } from "../auth/cchub-auth";
import { CCHubConfiguration } from "../../config/cchub-configuration";

@injectable()
export class AssetProcessorApiClientBuilder extends BaseCCHubApiClientBuilder {

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

    public async buildFontProcessorApiClient(): Promise<FontProcessorApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new FontProcessorApiClient(apiClientConfig);
    }

    public async buildPrivateDesignApiClient(): Promise<PrivateDesignProcessorApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new PrivateDesignProcessorApiClient(apiClientConfig);
    }

    public async buildDesignProcessorApiClient(): Promise<DesignProcessorApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new DesignProcessorApiClient(apiClientConfig);
    }

}
