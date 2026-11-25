import { listFormatOption, ListFormatOptions } from "../cli/list-format-option";
import { ListView } from "../views/list";
import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { PipelineListRow } from '../views/pipeline';
import { Command } from 'commander';
import { BackOfficeApiClientBuilder } from '../services/api/backoffice-api-client-builder';

@injectable()
export class PipelineCommands {

    constructor(
        @inject(BackOfficeApiClientBuilder) private readonly backOfficeApi: BackOfficeApiClientBuilder,
        @inject("pipelinesListView") private readonly listView: ListView<PipelineListRow>,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.backOfficeApi = backOfficeApi;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("pipelines")
            .description('Allows to get information about rendering pipelines')

        command
            .command("list")
            .addOption(listFormatOption())
            .argument("[searchString]", "A search string used to filter out pipelines (by name - partial)")
            .action(async (searchString: string | undefined, options: ListFormatOptions) => {
                await this.list(options, searchString);
            });

        return command;
    }

    private async list(options: ListFormatOptions, searchString?: string) {
        this.logger.debug(`Entered PipelineCommands.list. searchString: ${searchString}`);

        const productsManagementClient = await this.backOfficeApi.buildProductsManagementApiClient();

        const pipelines = await productsManagementClient.getAvailableProcessingPipelines(
            null, //skip
            null, // take 
            searchString // search
        );
        const tenantId = this.backOfficeApi.getCurrentTenantId();
        this.logger.info(`Found ${pipelines.total} pipelines for tenant ${tenantId}. `);

        const rows = (pipelines.items ?? []).map(({ id, name }) => ({ id, name }));
        this.listView.print(rows, options.format);
    }

}
