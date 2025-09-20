import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { CCHubBackOfficeApiService } from "../services/cchub-backofficeapi-service";
import { StorefrontView } from 'src/views/storefronts';
import { PipelineView } from 'src/views/pipeline';

@injectable()
export class PipelineCommands {

    constructor(
        @inject(CCHubBackOfficeApiService) private readonly backOfficeApi: CCHubBackOfficeApiService,
        @inject(PipelineView) private readonly pipelineView: PipelineView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.backOfficeApi = backOfficeApi;
        this.pipelineView = pipelineView;
        this.logger = logger;
    }

    public async list(searchString?: string) {
        const pipelines = await this.backOfficeApi.getPipelines(searchString);
        const tenantId = this.backOfficeApi.getCurrentTenantId();
        this.logger.info(`Found ${pipelines.total} pipelines for tenant ${tenantId}. `);

        console.log(this.pipelineView.listAsTable(pipelineView.items ?? []));
    }

}
