import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import {
    CreateProjectByRenderHiResScenarioDto,
    OrderDetailsDto,
    RenderHiResScenarioOutputColorSpace,
    RenderHiResScenarioOutputFlipMode,
    RenderHiResScenarioOutputFormat,
    RenderHiResScenarioOutputRotateMode
} from "@aurigma/axios-storefront-api-client";
import { StorefrontApiClientBuilder } from "../../services/storefront-api-client-builder";
import { ProjectView } from "../../views/project";

interface ProjectCreateRenderHiresOptions {
    storefrontId: number;
    designId: string;
    ownerId: string;
    outputFileName?: string;
    dpi?: number;
    format?: RenderHiResScenarioOutputFormat;
    colorSpace?: RenderHiResScenarioOutputColorSpace;
    flipMode?: RenderHiResScenarioOutputFlipMode;
    rotateMode?: RenderHiResScenarioOutputRotateMode;
    anonymousAccess?: boolean;
}

@injectable()
export class ProjectsCreateCommands {
    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(ProjectView) private readonly view: ProjectView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.storefrontApi = storefrontApi;
        this.view = view;
        this.logger = logger;
    }

    public addCli(parentCommand: Command): Command {
        const command = parentCommand
            .command("create")
            .description("Allows to create a new project");

        command
            .command("render-hires")
            .description("Creates a project by running RenderHiRes scenario")
            .requiredOption("-s --storefrontId <number>", "A storefront ID.")
            .requiredOption("-d --designId <string>", "A private design ID.")
            .requiredOption("-o --ownerId <string>", "A private design owner ID.")
            .option("--outputFileName <string>", "Render scenario output name")
            .option("--dpi <number>", "Output DPI", "300")
            .option("--format <value>", "Output format (Pdf, Jpeg, Png, Tiff, Bmp)", RenderHiResScenarioOutputFormat.Pdf)
            .option("--colorSpace <value>", "Output color space (Rgb, Grayscale, Cmyk)", RenderHiResScenarioOutputColorSpace.Cmyk)
            .option("--flipMode <value>", "Output flip mode (None, Horizontal, Vertical, Both)", RenderHiResScenarioOutputFlipMode.None)
            .option("--rotateMode <value>", "Output rotate mode (None, Rotate90, Rotate180, Rotate270, Auto)", RenderHiResScenarioOutputRotateMode.None)
            .option("--anonymousAccess", "Enable anonymous access for rendered result")
            .action(async (options: ProjectCreateRenderHiresOptions) => {
                this.logger.debug(`Entering "projects create render-hires" command. options=${JSON.stringify(options)}.`);
                await this.createByRenderHiresScenario(options);
            });

        return command;
    }

    private async createByRenderHiresScenario(options: ProjectCreateRenderHiresOptions): Promise<void> {
        this.logger.debug(`Entered ProjectsCreateCommands.createByRenderHiresScenario. options=${JSON.stringify(options)}.`);

        try {
            const projectsClient = await this.storefrontApi.buildProjectsApiClient();
            const timestamp = new Date().toISOString();
            const { designId, ownerId, storefrontId, dpi, format, colorSpace, flipMode, rotateMode, anonymousAccess } = options;

            const randomSixDigits = () => Math.floor(100000 + Math.random() * 900000);
            const orderSeed = randomSixDigits();
            const lineItemSeed = randomSixDigits();
            const customerSeed = randomSixDigits();

            const orderDetails: OrderDetailsDto = {
                orderId: String(orderSeed),
                orderUrl: `https://orders.local/${orderSeed}`,
                orderNumber: orderSeed,
                orderLineItemIndex: lineItemSeed,
                orderLineItemId: String(lineItemSeed),
                customerId: String(customerSeed),
                customerName: "Peter Peterson"
            };

            const createDto: CreateProjectByRenderHiResScenarioDto = {
                ownerId,
                name: timestamp,
                description: "Created through cchub-cli tool",
                orderDetails,
                scenario: {
                    designId,
                    name: options.outputFileName ?? `file_${orderSeed}`,
                    dpi,
                    format,
                    colorSpace,
                    flipMode,
                    rotateMode,
                    anonymousAccess: anonymousAccess ?? false
                }
            };

            const project = await projectsClient.createByRenderHiResScenario(storefrontId, null, createDto);
            console.log(this.view.createdProjectAsTable(project));
            this.logger.info(`Project created by render-hires. id=${project.id}, name=${project.name}, status=${project.status}, processingStatus=${project.processingStatus}.`);
        } catch (error) {
            this.logger.error(`Failed to create project by render-hires scenario. Error: ${error}`);
            process.exitCode = 1;
        }
    }
}
