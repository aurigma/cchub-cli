import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import { AssetsDesignsCommands } from "./assets/designs";
import { AssetsFontsCommands } from "./assets/fonts";
import { AssetsPrivateDesignsCommands } from "./assets/private-designs";
import { AssetsDataSchemasCommands } from "./assets/data-schemas";

export const ASSET_SORT_FIELDS = ["lastModified", "name", "size", "id"] as const;
export type AssetSortField = typeof ASSET_SORT_FIELDS[number];

@injectable()
export class AssetsCommands {
    constructor(
        @inject(AssetsDesignsCommands) private readonly designsCommands: AssetsDesignsCommands,
        @inject(AssetsFontsCommands) private readonly fontsCommands: AssetsFontsCommands,
        @inject(AssetsPrivateDesignsCommands) private readonly privateDesignsCommands: AssetsPrivateDesignsCommands,
        @inject(AssetsDataSchemasCommands) private readonly dataSchemasCommands: AssetsDataSchemasCommands,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.designsCommands = designsCommands;
        this.fontsCommands = fontsCommands;
        this.privateDesignsCommands = privateDesignsCommands;
        this.dataSchemasCommands = dataSchemasCommands;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        this.logger.debug("Entered AssetsCommands.addCli.");

        const command = parentCommand.command("assets")
            .description("Allows to work with assets");

        this.designsCommands.addCli(command);
        this.fontsCommands.addCli(command);
        this.privateDesignsCommands.addCli(command);
        this.dataSchemasCommands.addCli(command);

        return command;
    }
}
