import { listFormatOption, ListFormatOptions } from "../../cli/list-format-option";
import { ListView } from "../../views/list";
import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command, Option } from "commander";
import { DataSchemaDto } from "@aurigma/axios-asset-storage-api-client";
import { AssetStorageApiClientBuilder } from "../../services/api/asset-storage-api-client-builder";
import { DataSchemaListRow } from "../../views/data-schemas";
import { AssetSortField, ASSET_SORT_FIELDS } from "../assets";
import { parseNonNegativeInteger, parsePositiveInteger } from "../../cli/option-parsers";

interface DataSchemaListOptions extends ListFormatOptions {
    skip: number;
    take: number;
    path: string;
    search?: string;
    sort: AssetSortField;
}

@injectable()
export class AssetsDataSchemasCommands {
    constructor(
        @inject(AssetStorageApiClientBuilder) private readonly assetStorageApi: AssetStorageApiClientBuilder,
        @inject("dataSchemasListView") private readonly listView: ListView<DataSchemaListRow>,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.assetStorageApi = assetStorageApi;
        this.logger = logger;
    }

    public addCli(parentCommand: Command): Command {
        const command = parentCommand
            .command("data-schemas")
            .description("Allows to work with data schema assets");

        command
            .command("list")
            .addOption(listFormatOption())
            .description("Lists data schemas from asset storage")
            .option("-s, --skip <number>", "How many items to skip", parseNonNegativeInteger, 0)
            .option("-t, --take <number>", "How many items to take", parsePositiveInteger, 25)
            .option("-p, --path <string>", "Folder path filter", "/")
            .option("-q, --search <string>", "Search string")
            .addOption(
                new Option("--sort <value>", "Sorting field (DESC)")
                    .choices([...ASSET_SORT_FIELDS])
                    .default("lastModified")
            )
            .action(async (options: DataSchemaListOptions) => {
                this.logger.debug(`Entering "assets data-schemas list" command. options=${JSON.stringify(options)}.`);
                await this.listDataSchemas(options);
            });

        return command;
    }

    private async listDataSchemas(options: DataSchemaListOptions): Promise<void> {
        const { skip, take, path, search } = options;
        const sorting = `${options.sort ?? "lastModified"} DESC`;
        const client = await this.assetStorageApi.buildDataSchemasApiClient();
        const tenantId = this.assetStorageApi.getCurrentTenantId();

        const result = await client.getAll(
            path,
            true,
            skip,
            take,
            sorting,
            search,
            null,
            tenantId
        );

        const items = result.items ?? [];
        const rows = items.map(item => this.mapDataSchemaToRow(item));
        this.listView.print(rows, options.format);
        this.logger.info(`Found ${result.total ?? items.length} data schemas for tenant ${tenantId}. skip=${skip}, take=${take}, path=${path}, sort=${sorting}.`);
    }

    private mapDataSchemaToRow(dto: DataSchemaDto): DataSchemaListRow {
        return {
            id: dto.id ?? null,
            name: dto.name ?? null,
            path: dto.descriptor ?? null,
            size: dto.size ?? null,
            lastModifiedDate: dto.lastModified ?? null
        };
    }
}
