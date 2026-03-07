import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import { AssetsFontsCommands } from "./assets/fonts";
import { AssetsPrivateDesignsCommands } from "./assets/private-designs";

@injectable()
export class AssetsCommands {
    constructor(
        @inject(AssetsFontsCommands) private readonly fontsCommands: AssetsFontsCommands,
        @inject(AssetsPrivateDesignsCommands) private readonly privateDesignsCommands: AssetsPrivateDesignsCommands,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.fontsCommands = fontsCommands;
        this.privateDesignsCommands = privateDesignsCommands;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        this.logger.debug("Entered AssetsCommands.addCli.");

        const command = parentCommand.command("assets")
            .description("Allows to work with assets");

        this.fontsCommands.addCli(command);
        this.privateDesignsCommands.addCli(command);

        return command;
    }
}
