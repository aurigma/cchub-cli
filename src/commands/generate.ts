import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command, Option } from "commander";
import { DesignGenerator } from "../services/design-generator";
import { DesignSaveService } from "../services/design-save-service";
import { parseNonEmptyString } from "./shared/option-parsers";

const GENERATION_TARGETS = ["cchub", "local"] as const;
type GenerationTarget = typeof GENERATION_TARGETS[number];

interface GenerateHelloWorldOptions {
    target: GenerationTarget;
    filename: string;
    image?: string;
}

interface GenerateVdpDesignOptions {
    ownerId: string;
    filename: string;
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
            .addOption(
                new Option("-t, --target <target>", "Target where to save the result")
                    .choices([...GENERATION_TARGETS])
                    .makeOptionMandatory()
            )
            .requiredOption("-f, --filename <filename>", "Target filename.", parseNonEmptyString)
            .option("-i, --image <source>", "Source for create image in design. Can be a file path, asset storage ID, or URL", parseNonEmptyString)
            .action(async (options: GenerateHelloWorldOptions) => {
                await this.handleHelloWorld(options);
            });

        command
            .command("sample-vdp-design")
            .description("Generates a design to test VDP functionality.")
            .option("-f, --filename <filename>", "A target filename.", parseNonEmptyString)
            .option("-o, --ownerId <ownerId>", "A target owner ID. Omit to make it public.", parseNonEmptyString)
            .action(async (options: GenerateVdpDesignOptions) => {
                await this.handleSampleVdpDesign(options);
            });

        return command;
    }

    private async handleHelloWorld(options: GenerateHelloWorldOptions): Promise<void> {
        this.logger.debug(`Entered GenerateCommands.handleHelloWorld. options=${JSON.stringify(options)}.`);

        try {
            const helloWorldProduct = await this.designGenerator.generateHelloWorld(options.image);

            if (options.target === "local") {
                this.logger.debug(`Target branch selected: local. filename=${options.filename}`);
                await this.designSaveService.saveAsPreview(helloWorldProduct, options.filename);
            } else {
                this.logger.debug(`Target branch selected: cchub. filename=${options.filename}`);
                const newDesignId = await this.designSaveService.saveToCCHub(helloWorldProduct, options.filename);
                console.log(newDesignId);
            }

            this.logger.info(`Hello-world design generation completed successfully. target=${options.target}, filename=${options.filename}`);
        } catch (error) {
            this.logger.error(`Failed to execute "generate hello-world". Error: ${error}`);
            process.exitCode = 1;
        }
    }

    private async handleSampleVdpDesign(options: GenerateVdpDesignOptions) {
        this.logger.debug(`Entered GenerateCommands.handleSampleVdpDesign.`);

        try {
            this.logger.debug(`Attempting to generate a design...`);
            const vdpDesign = await this.designGenerator.generateVdpDesign();

            const timestamp = new Date().valueOf();
            const filename = `${options.filename ?? "VDP"} [${timestamp}]`;
            this.logger.debug(`Attempting to save a design as ${filename}`);

            const newDesignId = await this.designSaveService.saveToCCHub(vdpDesign, filename, options.ownerId);

            this.logger.info(`Sample VDP design generation completed successfully.`);

            console.log(newDesignId);
        } catch (error) {
            this.logger.error(`Failed to execute "generate sample-vdp-design". Error: ${error}`);
            process.exitCode = 1;
        }


    }
}
