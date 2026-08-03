import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command, Option } from "commander";
import { DesignDto } from "@aurigma/axios-asset-storage-api-client";
import { AssetStorageApiClientBuilder } from "../../services/asset-storage-api-client-builder";
import { DesignListRow, DesignsView } from "../../views/designs";
import { AssetSortField, ASSET_SORT_FIELDS } from "../assets";
import { DesignDataSchemaService } from "../../services/design-data-schema-service";
import { parseNonEmptyString, parseNonNegativeInteger, parsePositiveInteger } from "../../cli/option-parsers";
import { CliPartialSuccessError, CliUsageError } from "../../cli/errors";

interface LinkDataSchemaOptions {
    designId: string;
    schemaId: string;
}

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
        @inject(DesignDataSchemaService) private readonly designDataSchemaService: DesignDataSchemaService,
        @inject(DesignsView) private readonly designsView: DesignsView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.assetStorageApi = assetStorageApi;
        this.designDataSchemaService = designDataSchemaService;
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
            .option("-s, --skip <number>", "How many items to skip", parseNonNegativeInteger, 0)
            .option("-t, --take <number>", "How many items to take", parsePositiveInteger, 25)
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

        command
            .command("link-data-schema")
            .description("Links a data schema to a design")
            .requiredOption("-d, --design-id <id>", "Design asset ID", parseNonEmptyString)
            .requiredOption("-s, --schema-id <id>", "Data schema asset ID", parseNonEmptyString)
            .action(async (options: LinkDataSchemaOptions) => {
                this.logger.debug(`Entering "assets designs link-data-schema" command. options=${JSON.stringify(options)}.`);
                await this.linkDataSchema(options);
            });

        return command;
    }

    private async linkDataSchema(options: LinkDataSchemaOptions): Promise<void> {
        const designId = options.designId.trim();
        const schemaId = options.schemaId.trim();

        if (!designId || !schemaId) {
            throw new CliUsageError(this.designsView.invalidDataSchemaLinkArguments());
        }

        const design = await this.designDataSchemaService.link(designId, schemaId);
        this.logger.info(`Data schema linked successfully. designId=${designId}, schemaId=${schemaId}, hasProblems=${design.hasProblems}.`);

        if (design.hasProblems !== true) {
            console.log(this.designsView.dataSchemaLinked(designId, schemaId));
            return;
        }

        try {
            const problems = await this.designDataSchemaService.check(designId);
            console.log(this.designsView.dataSchemaLinkedWithProblems(designId, schemaId, problems));
        } catch (error) {
            throw new CliPartialSuccessError(
                this.designsView.dataSchemaLinkedButCheckFailed(designId, schemaId),
                error
            );
        }
    }

    private async listDesigns(options: DesignListOptions): Promise<void> {
        this.logger.debug(`Entered AssetsDesignsCommands.listDesigns. options=${JSON.stringify(options)}.`);

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
