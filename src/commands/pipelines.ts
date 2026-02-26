import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { PipelineView } from '../views/pipeline';
import { Command } from 'commander';
import { BackOfficeApiClientBuilder } from '../services/backoffice-api-client-builder';

@injectable()
export class PipelineCommands {

    constructor(
        @inject(BackOfficeApiClientBuilder) private readonly backOfficeApi: BackOfficeApiClientBuilder,
        @inject(PipelineView) private readonly pipelineView: PipelineView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.backOfficeApi = backOfficeApi;
        this.pipelineView = pipelineView;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("pipelines")
            .description('Allows to get information about rendering pipelines')

        command
            .command("list")
            .argument("[searchString]", "A search string used to filter out pipelines (by name - partial)")
            .action((searchString: string) => {
                this.list(searchString);
            });

        return command;
    }

    private async list(searchString?: string) {
        this.logger.debug(`Entered PipelineCommands.list. searchString: ${searchString}`);

        const productsManagementClient = await this.backOfficeApi.buildProductsManagementApiClient();

        const pipelines = await productsManagementClient.getAvailableProcessingPipelines(
            null, //skip
            null, // take 
            searchString // search
        );
        const tenantId = this.backOfficeApi.getCurrentTenantId();
        this.logger.info(`Found ${pipelines.total} pipelines for tenant ${tenantId}. `);

        const items = pipelines.items ?? [];

        console.log(this.pipelineView.listAsTable(items));
    }

}
