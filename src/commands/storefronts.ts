import { listFormatOption, ListFormatOptions } from "../cli/list-format-option";
import { ListView } from "../views/list";
import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { StorefrontListRow } from '../views/storefronts';
import { Command } from 'commander';
import { BackOfficeApiClientBuilder } from '../services/api/backoffice-api-client-builder';

@injectable()
export class StorefrontCommands {

    constructor(
        @inject(BackOfficeApiClientBuilder) private readonly backOfficeApi: BackOfficeApiClientBuilder,
        @inject("storefrontsListView") private readonly listView: ListView<StorefrontListRow>,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.backOfficeApi = backOfficeApi;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("storefronts")
            .description('Allows to work with storefronts')

        command
            .command("list")
            .addOption(listFormatOption())
            .argument("[searchString]", "A search string used to filter out storefronts (by name - partial)")
            .action(async (searchString: string | undefined, options: ListFormatOptions) => {
                await this.list(options, searchString);
            });

        return command;
    }

    private async list(options: ListFormatOptions, searchString?: string) {
        this.logger.debug(`Entered StorefrontCommands.list. searchString: ${searchString}`);

        const storefrontManagementClient = await this.backOfficeApi.buildStorefrontManagementApiClient();
        const storefronts = await storefrontManagementClient.getAll(
            null, // types
            null, // skip
            null, // take
            "Id DESC", // sorting
            searchString // search
        );
        const tenantId = this.backOfficeApi.getCurrentTenantId();
        this.logger.info(`Found ${storefronts.total} storefronts for tenant ${tenantId}. `);

        const rows = (storefronts.items ?? []).map(({ id, name, type, created }) => ({ id, name, type, created }));
        this.listView.print(rows, options.format);
    }

}
