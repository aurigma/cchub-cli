import { ApiClientConfiguration, ArtifactsApiClient, DesignsApiClient, FontsApiClient, PrivateDesignsApiClient } from "@aurigma/axios-asset-storage-api-client";
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
        this.logger.debug("Entered AssetStorageApiClientBuilder.buildPrivateDesignApiClient.");
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new PrivateDesignsApiClient(apiClientConfig);
    }

    public async buildDesignApiClient(): Promise<DesignsApiClient> {
        this.logger.debug("Entered AssetStorageApiClientBuilder.buildDesignApiClient.");
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new DesignsApiClient(apiClientConfig);
    }

    public async buildFontsApiClient(): Promise<FontsApiClient> {
        this.logger.debug("Entered AssetStorageApiClientBuilder.buildFontsApiClient.");
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new FontsApiClient(apiClientConfig);
    }

    public async buildArtifactsApiClient(): Promise<ArtifactsApiClient> {
        this.logger.debug("Entered AssetStorageApiClientBuilder.buildArtifactsApiClient.");
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new ArtifactsApiClient(apiClientConfig);
    }
}
