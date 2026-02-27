import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import { basename, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { AssetProcessorApiClientBuilder } from "../services/asset-processor-api-client-builder";
import { AssetStorageApiClientBuilder } from "../services/asset-storage-api-client-builder";
import { FontDto } from "@aurigma/axios-asset-storage-api-client";
import { FontsView, FontListRow } from "../views/fonts";

@injectable()
export class AssetsCommands {
    constructor(
        @inject(AssetProcessorApiClientBuilder) private readonly assetProcessorApi: AssetProcessorApiClientBuilder,
        @inject(AssetStorageApiClientBuilder) private readonly assetStorageApi: AssetStorageApiClientBuilder,
        @inject(FontsView) private readonly fontsView: FontsView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.assetProcessorApi = assetProcessorApi;
        this.assetStorageApi = assetStorageApi;
        this.fontsView = fontsView;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        this.logger.debug("Entered AssetsCommands.addCli.");

        const command = parentCommand.command("assets")
            .description("Allows to work with assets");

        const fontsCommand = command
            .command("fonts")
            .description("Allows to work with font assets");

        fontsCommand
            .command("import")
            .description("Imports a local font file to asset processor root path")
            .argument("<fontFile>", "Local path to a font file")
            .action(async (fontFile: string) => {
                this.logger.debug(`Entering "assets fonts import" command. fontFile=${fontFile}.`);
                await this.importFont(fontFile);
            });

        fontsCommand
            .command("list")
            .description("Lists fonts from asset storage")
            .action(async () => {
                this.logger.debug('Entering "assets fonts list" command.');
                await this.listFonts();
            });

        return command;
    }

    private async importFont(fontFile: string): Promise<void> {
        this.logger.debug(`Entered AssetsCommands.importFont. fontFile=${fontFile}.`);

        try {
            const resolvedFontFile = resolve(fontFile);
            this.logger.debug(`Resolved font path: ${resolvedFontFile}.`);

            if (!existsSync(resolvedFontFile)) {
                this.logger.debug("Branch: font file does not exist.");
                this.logger.error(`Font file does not exist: ${resolvedFontFile}`);
                process.exitCode = 2;
                return;
            }
            this.logger.debug("Branch: font file exists.");

            const client = await this.assetProcessorApi.buildFontProcessorApiClient();
            const tenantId = this.assetProcessorApi.getCurrentTenantId();
            this.logger.debug(`Prepared FontProcessorApiClient. tenantId=${tenantId}.`);
            const fontName = basename(resolvedFontFile);
            const fontFileData = readFileSync(resolvedFontFile);
            const sourceFile = {
                data: new Blob([fontFileData]),
                fileName: fontName
            };
            this.logger.debug(`Prepared source file payload for import. fileName=${fontName}.`);

            const dto = await client.importFont(
                tenantId,
                fontName,
                "/",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                sourceFile
            );
            this.logger.debug(`Import completed. dto.id=${dto.id}.`);

            this.logger.info(`Font imported successfully. id=${dto.id}, postscriptName=${dto.metadata?.postscriptName}`);
        } catch (error) {
            this.logger.error(`Failed to import font from "${fontFile}". Error: ${error}`);
            process.exitCode = 1;
        }
    }

    private async listFonts(): Promise<void> {
        this.logger.debug("Entered AssetsCommands.listFonts.");

        try {
            const client = await this.assetStorageApi.buildFontsApiClient();
            const tenantId = this.assetStorageApi.getCurrentTenantId();
            this.logger.debug(`Prepared FontsApiClient. tenantId=${tenantId}.`);

            const result = await client.getAll(
                null, // postscriptNames
                "/", // path
                true, // includeSubfolders
                null, // skip
                null, // take
                "lastModified DESC", // sorting
                null, // search
                null, // customFields
                tenantId
            );

            const items = result.items ?? [];
            this.logger.debug(`Fonts query completed. total=${result.total ?? 0}, items=${items.length}.`);
            const rows = items.map(x => this.mapFontToRow(x));
            console.log(this.fontsView.listAsTable(rows));
            this.logger.info(`Found ${result.total ?? items.length} fonts for tenant ${tenantId}.`);
        } catch (error) {
            this.logger.error(`Failed to list fonts. Error: ${error}`);
            process.exitCode = 1;
        }
    }

    private mapFontToRow(dto: FontDto): FontListRow {
        this.logger.debug(`Entered AssetsCommands.mapFontToRow. id=${dto?.id}.`);

        const fallbackCreated = dto?.customFields?.["created"] as string | undefined;
        if (dto?.lastModified) {
            this.logger.debug(`Branch: using lastModified for font id=${dto?.id}.`);
        } else if (fallbackCreated) {
            this.logger.debug(`Branch: using created fallback for font id=${dto?.id}.`);
        } else {
            this.logger.debug(`Branch: no date fields for font id=${dto?.id}.`);
        }

        return {
            id: dto?.id ?? null,
            name: dto?.name ?? null,
            path: dto?.descriptor ?? null,
            postscriptName: dto?.metadata?.postscriptName ?? null,
            lastModified: dto?.lastModified ?? fallbackCreated ?? null
        };
    }
}
