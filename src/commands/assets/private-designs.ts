import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command, Option } from "commander";
import { DesignDto } from "@aurigma/axios-asset-storage-api-client";
import { DesignAtomsServiceApiClient } from "@aurigma/axios-design-atoms-api-client";
import { AssetStorageApiClientBuilder } from "../../services/api/asset-storage-api-client-builder";
import { PrivateDesignListRow, PrivateDesignsView } from "../../views/private-designs";
import { DesignAtomsApiClientBuilder } from "../../services/api/design-atoms-api-client-builder";
import { AssetProcessorApiClientBuilder } from "../../services/api/asset-processor-api-client-builder";
import { readFile } from "node:fs/promises";
import { VdpDatasetCsvConverter } from "../../services/vdp/vdp-dataset-csv-converter";
import { DatasetOutputFormat, VdpDataSet } from "../../types/vdp-dataset";
import { parseNonEmptyString, parseNonNegativeInteger, parsePositiveInteger } from "../../cli/option-parsers";

interface PrivateDesignListOptions {
    skip: number;
    take: number;
    search?: string;
    ownerId?: string;
}

interface PrivateDesignGetVariablesOptions {
    designId: string;
    ownerId: string;
}

interface PrivateDesignFromPublicOptions {
    designId: string;
    ownerId: string;
}

interface PrivateDesignGetDatasetOptions {
    designId: string;
    ownerId: string;
    output: DatasetOutputFormat;
}

interface PrivateDesignUpdateDatasetOptions {
    designId: string;
    ownerId: string;
    dataset: string;
    append?: boolean;
}

@injectable()
export class AssetsPrivateDesignsCommands {
    private static readonly datasetOutputFormats: DatasetOutputFormat[] = ["json", "csv", "table"];

    constructor(
        @inject(AssetStorageApiClientBuilder) private readonly assetStorageApi: AssetStorageApiClientBuilder,
        @inject(AssetProcessorApiClientBuilder) private readonly assetProcessorApi: AssetProcessorApiClientBuilder,
        @inject(DesignAtomsApiClientBuilder) private readonly designAtomsApi: DesignAtomsApiClientBuilder,
        @inject(VdpDatasetCsvConverter) private readonly vdpDatasetCsvConverter: VdpDatasetCsvConverter,
        @inject(PrivateDesignsView) private readonly privateDesignsView: PrivateDesignsView,
        @inject("Logger") private readonly logger: Logger
    ) {
    }

    public addCli(parentCommand: Command): Command {
        const command = parentCommand
            .command("private-designs")
            .description("Allows to work with private design assets");

        command
            .command("list")
            .description("Lists private design assets from asset storage")
            .option("-s, --skip <number>", "How many items to skip", parseNonNegativeInteger, 0)
            .option("-t, --take <number>", "How many items to take", parsePositiveInteger, 25)
            .option("-q, --search <string>", "Search string")
            .option("-o, --ownerId <string>", "Private storage owner ID", parseNonEmptyString)
            .action(async (options: PrivateDesignListOptions) => {
                this.logger.debug(`Entering "assets private-designs list" command. options=${JSON.stringify(options)}.`);
                await this.listPrivateDesigns(options);
            });

        command
            .command("from-public")
            .description("Creates a private design based on a public design")
            .requiredOption("-d --designId <string>", "Public design ID", parseNonEmptyString)
            .requiredOption("-o --ownerId <string>", "New owner ID", parseNonEmptyString)
            .action(async (options: PrivateDesignFromPublicOptions) => {
                this.logger.debug(`Entering "assets private-designs get-variables" command. options=${JSON.stringify(options)}.`);
                await this.copyFromPublic(options);
            });


        command
            .command("get-variables")
            .description("Get a list of variables from a specified private design")
            .requiredOption("-d, --designId <string>", "Design ID", parseNonEmptyString)
            .requiredOption("-o, --ownerId <string>", "Private storage owner ID", parseNonEmptyString)
            .action(async (options: PrivateDesignGetVariablesOptions) => {
                this.logger.debug(`Entering "assets private-designs get-variables" command. options=${JSON.stringify(options)}.`);
                await this.getVariables(options);
            });

        command
            .command("get-dataset")
            .description("Get VDP dataset from a specified private design. Default output is table.")
            .requiredOption("-d --designId <string>", "Design ID", parseNonEmptyString)
            .requiredOption("-o --ownerId <string>", "Private storage owner ID", parseNonEmptyString)
            .addOption(
                new Option("--output <type>", "Output type. csv/table omit surface-level fields (surfaceBinding, iterateOverSurfacesFirst).")
                    .choices([...AssetsPrivateDesignsCommands.datasetOutputFormats])
                    .default("table")
            )
            .addHelpText("after", "\nExamples:\n  assets private-designs get-dataset -d <designId> -o <ownerId>\n  assets private-designs get-dataset -d <designId> -o <ownerId> --output json\n  assets private-designs get-dataset -d <designId> -o <ownerId> --output csv")
            .action(async (options: PrivateDesignGetDatasetOptions) => {
                this.logger.debug(`Entering "assets private-designs get-dataset" command. options=${JSON.stringify(options)}.`);
                await this.getDataset(options);
            });

        command
            .command("update-dataset")
            .description("Update VDP dataset from CSV for a specified private design")
            .requiredOption("-d, --designId <string>", "Design ID", parseNonEmptyString)
            .requiredOption("-o, --ownerId <string>", "Private storage owner ID", parseNonEmptyString)
            .requiredOption("--dataset <string>", "Dataset CSV file path", parseNonEmptyString)
            .option("--append", "Append CSV rows to existing VDP dataset")
            .action(async (options: PrivateDesignUpdateDatasetOptions) => {
                this.logger.debug(`Entering "assets private-designs update-dataset" command. options=${JSON.stringify(options)}.`);
                await this.updateDataset(options);
            });

        return command;
    }

    private async copyFromPublic(options: PrivateDesignFromPublicOptions) {
        this.logger.debug(`Entered AssetsPrivateDesignsCommands.copyFromPublic. options=${JSON.stringify(options)}.`);

        const privateDesignApiClient = await this.assetProcessorApi.buildPrivateDesignApiClient();
        const copy = await privateDesignApiClient.copyDesignFromPublicDesign(undefined, options.ownerId, {
            publicDesignId: options.designId
        });

        console.log(this.privateDesignsView.listAsTable([copy]));

    }

    private async getVariables(options: PrivateDesignGetVariablesOptions) {
        this.logger.debug(`Entered AssetsPrivateDesignsCommands.getVariables. options=${JSON.stringify(options)}.`);

        const client = await this.designAtomsApi.buildDesignAtomsServiceApiClient();
        const variables = await client.getVariables(options.designId, options.ownerId);

        console.log(this.privateDesignsView.variables(variables.items ?? []));        
    }

    private async getDataset(options: PrivateDesignGetDatasetOptions): Promise<void> {
        this.logger.debug(`Entered AssetsPrivateDesignsCommands.getDataset. options=${JSON.stringify(options)}.`);

        const client = await this.designAtomsApi.buildDesignAtomsServiceApiClient();
        const result = await this.tryLoadVdpData(client, options.designId, options.ownerId);
        const dataset = (result?.vdpDataSet ?? null) as VdpDataSet | null;

        console.log(this.privateDesignsView.dataset(dataset, options.output));
    }

    private async updateDataset(options: PrivateDesignUpdateDatasetOptions): Promise<void> {
        this.logger.debug(`Entered AssetsPrivateDesignsCommands.updateDataset. options=${JSON.stringify(options)}.`);

        const designId = options.designId;
        const ownerId = options.ownerId;
        const datasetPath = options.dataset;
        const csv = await readFile(datasetPath, "utf-8");
        const client = await this.designAtomsApi.buildDesignAtomsServiceApiClient();
        const variables = await client.getVariables(designId, ownerId);
        const currentVdpData = options.append
            ? await this.tryLoadVdpData(client, designId, ownerId)
            : null;
        const payload = this.vdpDatasetCsvConverter.csvToVdpData(
            csv,
            variables.items ?? [],
            currentVdpData
        );

        await client.saveVdpData(designId, ownerId, undefined, {
            ...payload
        });

        console.log(this.privateDesignsView.datasetUpdated());
    }

    private async tryLoadVdpData(client: DesignAtomsServiceApiClient, designId: string, ownerId: string) {
        try {
            return await client.loadVdpData(designId, ownerId);
        } catch (error) {
            if (this.isMissingVdpDataError(error)) {
                return null;
            }
            throw error;
        }
    }

    private isMissingVdpDataError(error: unknown): boolean {
        const status = (error as { status?: number })?.status;
        if (status === 404 || status === 409) {
            return true;
        }
        const text = String(error ?? "").toLowerCase();
        return text.includes("conflict") || text.includes("not found");
    }

    private async listPrivateDesigns(options: PrivateDesignListOptions): Promise<void> {
        this.logger.debug(`Entered AssetsPrivateDesignsCommands.listPrivateDesigns. options=${JSON.stringify(options)}.`);

        const { skip, take, search, ownerId } = options;

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
