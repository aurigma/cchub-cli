import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import { DesignDto } from "@aurigma/axios-asset-storage-api-client";
import { AssetStorageApiClientBuilder } from "../../services/asset-storage-api-client-builder";
import { PrivateDesignListRow, PrivateDesignsView } from "../../views/private-designs";

interface PrivateDesignListOptions {
    skip: number;
    take: number;
    search?: string;
    ownerId?: string;
}

@injectable()
export class AssetsPrivateDesignsCommands {
    constructor(
        @inject(AssetStorageApiClientBuilder) private readonly assetStorageApi: AssetStorageApiClientBuilder,
        @inject(PrivateDesignsView) private readonly privateDesignsView: PrivateDesignsView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.assetStorageApi = assetStorageApi;
        this.privateDesignsView = privateDesignsView;
        this.logger = logger;
    }

    public addCli(parentCommand: Command): Command {
        const command = parentCommand
            .command("private-designs")
            .description("Allows to work with private design assets");

        command
            .command("list")
            .description("Lists private design assets from asset storage")
            .option("--skip <number>", "How many items to skip", "0")
            .option("--take <number>", "How many items to take", "25")
            .option("--search <string>", "Search string")
            .option("--ownerId <string>", "Private storage owner ID")
            .action(async (options: PrivateDesignListOptions) => {
                this.logger.debug(`Entering "assets private-designs list" command. options=${JSON.stringify(options)}.`);
                await this.listPrivateDesigns(options);
            });

        return command;
    }

    private async listPrivateDesigns(options: PrivateDesignListOptions): Promise<void> {
        this.logger.debug(`Entered AssetsPrivateDesignsCommands.listPrivateDesigns. options=${JSON.stringify(options)}.`);

        try {
            const parsedSkip = Number.parseInt(String(options.skip), 10);
            const parsedTake = Number.parseInt(String(options.take), 10);
            const skip = Number.isNaN(parsedSkip) ? 0 : Math.max(0, parsedSkip);
            const take = Number.isNaN(parsedTake) ? 25 : Math.max(0, parsedTake);
            const search = options.search?.trim() ? options.search.trim() : null;
            const ownerId = options.ownerId?.trim() ? options.ownerId.trim() : null;

            const client = await this.assetStorageApi.buildPrivateDesignApiClient();
            const tenantId = this.assetStorageApi.getCurrentTenantId();
            this.logger.debug(`Prepared PrivateDesignsApiClient. tenantId=${tenantId}, skip=${skip}, take=${take}, ownerId=${ownerId}.`);

            const result = await client.getAll(
                null, // retentionPolicy
                null, // dataSchemaId
                null, // toggleSetId
                null, // paletteId
                null, // paletteUID
                null, // fontPostScriptName
                "/", // path
                true, // includeSubfolders
                skip,
                take,
                "lastModified DESC",
                search,
                null, // customFields
                tenantId,
                ownerId
            );

            const items = result.items ?? [];
            const total = result.total ?? items.length;
            const rows = items.map(x => this.mapPrivateDesignToRow(x));

            console.log(this.privateDesignsView.listAsTable(rows));
            console.log(`returned ${skip}-${skip + items.length} of ${total}`);

            this.logger.info(`Listed private designs. total=${total}, returned=${items.length}, skip=${skip}, take=${take}, ownerId=${ownerId}.`);
        } catch (error) {
            this.logger.error(`Failed to list private designs. Error: ${error}`);
            process.exitCode = 1;
        }
    }

    private mapPrivateDesignToRow(dto: DesignDto): PrivateDesignListRow {
        this.logger.debug(`Entered AssetsPrivateDesignsCommands.mapPrivateDesignToRow. id=${dto?.id}.`);

        return {
            id: dto?.id ?? null,
            name: dto?.name ?? null,
            ownerId: dto?.ownerId ?? null,
            size: dto?.size ?? null,
            lastModified: dto?.lastModified ?? null
        };
    }
}
