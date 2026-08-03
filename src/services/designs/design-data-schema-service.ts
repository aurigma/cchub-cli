import { inject, injectable } from "tsyringe";
import { DesignDto, DesignProblemDto } from "@aurigma/axios-asset-processor-api-client";
import { AssetProcessorApiClientBuilder } from "../api/asset-processor-api-client-builder";

@injectable()
export class DesignDataSchemaService {
    constructor(
        @inject(AssetProcessorApiClientBuilder) private readonly assetProcessorApi: AssetProcessorApiClientBuilder
    ) {
        this.assetProcessorApi = assetProcessorApi;
    }

    public async link(designId: string, schemaId: string): Promise<DesignDto> {
        const client = await this.assetProcessorApi.buildDesignProcessorApiClient();
        const tenantId = this.assetProcessorApi.getCurrentTenantId();

        return client.linkDataSchema(designId, tenantId, { schemaId });
    }

    public async check(designId: string): Promise<DesignProblemDto> {
        const client = await this.assetProcessorApi.buildDesignProcessorApiClient();
        const tenantId = this.assetProcessorApi.getCurrentTenantId();

        return client.check(designId, tenantId);
    }
}
