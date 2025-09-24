import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { StorefrontView } from 'src/views/storefronts';
import { Command } from 'commander';
import { BackOfficeApiClientBuilder } from 'src/services/backoffice-api-client-builder';

@injectable()
export class StorefrontCommands {

    constructor(
        @inject(BackOfficeApiClientBuilder) private readonly backOfficeApi: BackOfficeApiClientBuilder,
        @inject(StorefrontView) private readonly storefrontView: StorefrontView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.backOfficeApi = backOfficeApi;
        this.storefrontView = storefrontView;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("storefronts")
            .description('Allows to work with storefronts')

        command
            .command("list")
            .argument("[searchString]", "A search string used to filter out storefronts (by name - partial)")
            .action((searchString: string) => {
                this.list(searchString);
            });

        return command;
    }

    public async list(searchString?: string) {
        this.logger.debug(`Entered StorefrontCommands.list. searchString: ${searchString}`);

        const storefrontManagementClient = await this.backOfficeApi.buildStorefrontManagementApiClient();
        const storefronts = await storefrontManagementClient.getAll(
            null, // types
            null, // skip
            null, // take
            "LastModified DESC",
            searchString // search
        );
        const tenantId = this.backOfficeApi.getCurrentTenantId();
        this.logger.info(`Found ${storefronts.total} storefronts for tenant ${tenantId}. `);

        console.log(this.storefrontView.listAsTable(storefronts.items ?? []));
    }

}
