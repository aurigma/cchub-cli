import { ApiClientConfiguration, DesignAtomsImagesApiClient, DesignAtomsServiceApiClient, DesignAtomsPrintProductItemsApiClient } from "@aurigma/axios-design-atoms-api-client";
import { BaseCCHubApiClientBuilder, IApiClientConfiguration } from "./base-cchub-api-client-builder";
import { inject, injectable } from "tsyringe";
import { CCHubAuth } from "../auth/cchub-auth";
import { CCHubConfiguration } from "../../config/cchub-configuration";
import { Logger } from "winston";

@injectable()
export class DesignAtomsApiClientBuilder extends BaseCCHubApiClientBuilder {

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

    public async buildDesignAtomsImagesApiClient(): Promise<DesignAtomsImagesApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new DesignAtomsImagesApiClient(apiClientConfig);
    }

    public async buildDesignAtomsServiceApiClient(): Promise<DesignAtomsServiceApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new DesignAtomsServiceApiClient(apiClientConfig);
    }

    public async buildDesignAtomsPrintProductItemsApiClient(): Promise<DesignAtomsPrintProductItemsApiClient> {
        const apiClientConfig = await this.initApiClientConfiguration() as ApiClientConfiguration;

        return new DesignAtomsPrintProductItemsApiClient(apiClientConfig);
    }
}
