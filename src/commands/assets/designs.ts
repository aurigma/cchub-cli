import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command, Option } from "commander";
import { DesignDto } from "@aurigma/axios-asset-storage-api-client";
import { AssetStorageApiClientBuilder } from "../../services/asset-storage-api-client-builder";
import { DesignListRow, DesignsView } from "../../views/designs";
import { AssetSortField, ASSET_SORT_FIELDS } from "../assets";

interface DesignListOptions {
    skip: number;
    take: number;
    path: string;
    search?: string;
    sort: AssetSortField;
    hasProblems?: boolean;
}

@injectable()
export class AssetsDesignsCommands {
    constructor(
        @inject(AssetStorageApiClientBuilder) private readonly assetStorageApi: AssetStorageApiClientBuilder,
        @inject(DesignsView) private readonly designsView: DesignsView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.assetStorageApi = assetStorageApi;
        this.designsView = designsView;
        this.logger = logger;
    }

    public addCli(parentCommand: Command): Command {
        const command = parentCommand
            .command("designs")
            .description("Allows to work with design assets");

        command
            .command("list")
            .description("Lists designs from asset storage")
            .option("-s, --skip <number>", "How many items to skip", "0")
            .option("-t, --take <number>", "How many items to take", "25")
            .option("-p, --path <string>", "Folder path filter", "/")
            .option("-q, --search <string>", "Search string")
            .option("--has-problems", "Add this flag to show only designs with problems")
            .addOption(
                new Option("--sort <value>", "Sorting field (DESC)")
                    .choices([...ASSET_SORT_FIELDS])
                    .default("lastModified")
            )
            .action(async (options: DesignListOptions) => {
                this.logger.debug(`Entering "assets designs list" command. options=${JSON.stringify(options)}.`);
                await this.listDesigns(options);
            });

        return command;
    }

    private async listDesigns(options: DesignListOptions): Promise<void> {
        this.logger.debug(`Entered AssetsDesignsCommands.listDesigns. options=${JSON.stringify(options)}.`);

        try {
            const { skip, take, path, search, hasProblems } = options;
            const sorting = `${options.sort ?? "lastModified"} DESC`;

            const client = await this.assetStorageApi.buildDesignApiClient();
            const tenantId = this.assetStorageApi.getCurrentTenantId();

            const result = await client.getAll(
                null, // dataSchemaId
                null, // toggleSetId
                null, // paletteId
                null, // paletteUID
                null, // fontPostScriptName
                path,
                true, // includeSubfolders
                skip,
                take,
                sorting,
                search,
                null, // customFields
                tenantId
            );

            const items = result.items ?? [];
            const rows = items
                .map(x => this.mapDesignToRow(x))
                .filter(x => !hasProblems || x.hasProblems)
            console.log(this.designsView.listAsTable(rows));
            this.logger.info(`Found ${result.total ?? items.length} designs for tenant ${tenantId}. skip=${skip}, take=${take}, path=${path}, sort=${sorting}.`);
        } catch (error) {
            this.logger.error(`Failed to list designs. Error: ${error}`);
            process.exitCode = 1;
        }
    }

    private mapDesignToRow(dto: DesignDto): DesignListRow {
        this.logger.debug(`Entered AssetsDesignsCommands.mapDesignToRow. id=${dto?.id}.`);
        return {
            id: dto?.id ?? null,
            name: dto?.name ?? null,
            path: dto?.descriptor ?? null,
            size: dto?.size ?? null,
            hasProblems: dto?.hasProblems ?? null,
            lastModifiedDate: dto?.lastModified ?? null
        };
    }
}
