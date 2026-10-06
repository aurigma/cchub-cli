import { ApiClientConfiguration, CostCalculationApiClient } from "@aurigma/axios-price-calculator-api-client";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { CCHubConfiguration } from "../../config/cchub-configuration";
import { CCHubAuth } from "../auth/cchub-auth";
import { BaseCCHubApiClientBuilder, IApiClientConfiguration } from "./base-cchub-api-client-builder";

@injectable()
export class PriceCalculatorApiClientBuilder extends BaseCCHubApiClientBuilder {
    constructor(
        @inject("Logger") logger: Logger,
        @inject(CCHubAuth) authService: CCHubAuth,
        @inject(CCHubConfiguration) config: CCHubConfiguration
    ) {
        super(logger, authService, config);
    }

    protected buildClientConfiguration(): IApiClientConfiguration {
        return new ApiClientConfiguration();
    }

    public async buildCostCalculationApiClient(): Promise<CostCalculationApiClient> {
        const config = await this.initApiClientConfiguration() as ApiClientConfiguration;
        return new CostCalculationApiClient(config);
    }
}
