import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import { DesignGenerator } from "../services/design-generator";
import { DesignSaveService } from "../services/design-save-service";

type GenerationTarget = "cchub" | "local";

interface GenerateHelloWorldOptions {
    target: GenerationTarget;
    filename: string;
    image?: string;
}

@injectable()
export class GenerateCommands {

    constructor(
        @inject(DesignGenerator) private readonly designGenerator: DesignGenerator,
        @inject(DesignSaveService) private readonly designSaveService: DesignSaveService,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.designGenerator = designGenerator;
        this.designSaveService = designSaveService;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("generate")
            .description("Allows to generate designs and save them.");

        command
            .command("hello-world")
            .description("Generates a hello-world design.")
            .requiredOption("-t, --target <target>", "Target where to save the result (cchub|local).")
            .requiredOption("-f, --filename <filename>", "Target filename.")
            .option("-i, --image <source>", "Source for create image in design. Can be a file path, asset storage ID, or URL")
            .action(async (options: GenerateHelloWorldOptions) => {
                await this.handleHelloWorld(options);
            });

        return command;
    }

    private async handleHelloWorld(options: GenerateHelloWorldOptions): Promise<void> {
        this.logger.debug(`Entered GenerateCommands.handleHelloWorld. options=${JSON.stringify(options)}.`);

        if (options.target !== "cchub" && options.target !== "local") {
            this.logger.error(`Invalid target value: ${options.target}. Expected "cchub" or "local".`);
            console.error("Invalid value for --target. Allowed values: cchub, local.");
            process.exitCode = 2;
            return;
        }

        try {
            const helloWorldProduct = await this.designGenerator.generateHelloWorld(options.image);

            if (options.target === "local") {
                this.logger.debug(`Target branch selected: local. filename=${options.filename}`);
                await this.designSaveService.saveAsPreview(helloWorldProduct, options.filename);
            } else {
                this.logger.debug(`Target branch selected: cchub. filename=${options.filename}`);
                await this.designSaveService.saveToCCHub(helloWorldProduct, options.filename);
            }

            this.logger.info(`Hello-world design generation completed successfully. target=${options.target}, filename=${options.filename}`);
        } catch (error) {
            this.logger.error(`Failed to execute "generate hello-world". Error: ${error}`);
            console.error("Failed to execute command 'generate hello-world'.");
            process.exitCode = 1;
        }
    }
}
