import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command } from "commander";
import {
    CreateProjectByRenderHiResScenarioDto,
    CreateProjectBySpecificPipelineScenarioDto,
    OrderDetailsDto,
    RenderHiResScenarioOutputColorSpace,
    RenderHiResScenarioOutputFlipMode,
    RenderHiResScenarioOutputFormat,
    RenderHiResScenarioOutputRotateMode
} from "@aurigma/axios-storefront-api-client";
import { StorefrontApiClientBuilder } from "../../services/storefront-api-client-builder";
import { ProjectView } from "../../views/project";
import { AssetProcessorApiClientBuilder } from "src/services/asset-processor-api-client-builder";
import { DesignProblemDto } from "@aurigma/axios-asset-processor-api-client";

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

interface ProjectCreatePipelineOptions {
    storefrontId: number;
    designId: string;
    ownerId: string;
    pipelineId: number;
}

@injectable()
export class ProjectsCreateCommands {
    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(AssetProcessorApiClientBuilder) private readonly assetProcessorApi: AssetProcessorApiClientBuilder,
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
            .option("-o --ownerId <string>", "A private design owner ID. If omitted, it is considered that designId is a public design (a copy is created).")
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

        command
            .command("through-pipeline")
            .description("Creates a project by running a specified order processing pipeline")
            .requiredOption("-s, --storefrontId <number>", "A storefront ID.")
            .requiredOption("-d, --designId <string>", "A private design ID.")
            .requiredOption("-p, --pipelineId <number>", "A pipeline ID.")
            .option("-o, --ownerId <string>", "A private design owner ID. If omitted, it is considered that designId is a public design (a copy is created).")
            .action(async (options: ProjectCreatePipelineOptions) => {
                this.logger.debug(`Entering "projects create through-pipeline" command. options=${JSON.stringify(options)}.`);
                await this.createByPipelineScenario(options);
            });

        return command;
    }

    private async createByRenderHiresScenario(options: ProjectCreateRenderHiresOptions) {
        this.logger.debug(`Entered ProjectsCreateCommands.createByRenderHiresScenario. options=${JSON.stringify(options)}.`);

        try {
            const projectsClient = await this.storefrontApi.buildProjectsApiClient();
            const timestamp = new Date().toISOString();
            const { storefrontId, dpi, format, colorSpace, flipMode, rotateMode, anonymousAccess } = options;
            const { designId, ownerId } = await this.ensureDesignIsPrivate(options.designId, options.ownerId);

            const orderDetails: OrderDetailsDto = this.generateRandomOrderDetails();

            const checkResult = await this.checkDesignForProblems(designId, ownerId);
            if (this.areProblemsDetected(checkResult)) {
                this.logger.warn(`Design ${designId} for ${ownerId} contains some issues`);
                console.log(this.view.visualizeDesignProblems(checkResult));
                process.exitCode = 2;
                return;
            }

            const createDto: CreateProjectByRenderHiResScenarioDto = {
                ownerId,
                name: timestamp,
                description: "Created through cchub-cli tool (render-hires)",
                orderDetails,
                scenario: {
                    designId,
                    name: options.outputFileName ?? `file_${orderDetails.orderNumber}`,
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
            this.logger.error(`Failed to create project through pipeline. ${error}. ${error?.response}`);
            process.exitCode = 1;
        }
    }

    private async createByPipelineScenario(options: ProjectCreatePipelineOptions) {
        this.logger.debug(`Entered ProjectsCreateCommands.createByPipelineScenario. options=${JSON.stringify(options)}.`);

        try {
            const projectsClient = await this.storefrontApi.buildProjectsApiClient();
            const timestamp = new Date().toISOString();
            const { storefrontId, pipelineId } = options;

            const { designId, ownerId } = await this.ensureDesignIsPrivate(options.designId, options.ownerId);

            const orderDetails: OrderDetailsDto = this.generateRandomOrderDetails();

            const checkResult = await this.checkDesignForProblems(designId, ownerId);
            if (this.areProblemsDetected(checkResult)) {
                this.logger.warn(`Design ${designId} for ${ownerId} contains some issues`);
                console.log(this.view.visualizeDesignProblems(checkResult));
                process.exitCode = 2;
                return;
            }

            const createDto: CreateProjectBySpecificPipelineScenarioDto = {
                ownerId,
                name: timestamp,
                description: "Created through cchub-cli tool (through-pipeline)",
                orderDetails,
                items: [
                    {
                        designIds: [designId],
                        fields: {
                            "My Field": "Foobar"
                        },
                        name: "My line item name",
                        quantity: 1,
                        sku: "SKU-123",
                        orderLineItemId: "xxxx-xxxx-xxxx",
                        orderLineItemIndex: 0
                    }
                ],
                scenario: {
                    pipelineId
                }
            };

            this.logger.debug(`Attempting to create a project through pipeline ${pipelineId}. dto=${JSON.stringify(createDto)}`);
            const project = await projectsClient.createBySpecificPipelineScenario(storefrontId, null, createDto);
            console.log(this.view.createdProjectAsTable(project));
            this.logger.info(`Project created through a pipeline ${pipelineId}. id=${project.id}, name=${project.name}, status=${project.status}, processingStatus=${project.processingStatus}.`);
        } catch (error) {
            this.logger.error(`Failed to create project through pipeline. ${error}. ${error?.response}`);
            process.exitCode = 1;
        }
    }

    private generateRandomOrderDetails(): OrderDetailsDto {
        const randomSixDigits = () => Math.floor(100000 + Math.random() * 900000);
        const orderSeed = randomSixDigits();
        const lineItemSeed = randomSixDigits();
        const customerSeed = randomSixDigits();

        return {
            orderId: String(orderSeed),
            orderUrl: `https://orders.local/${orderSeed}`,
            orderNumber: orderSeed,
            orderLineItemIndex: lineItemSeed,
            orderLineItemId: String(lineItemSeed),
            customerId: String(customerSeed),
            customerName: "Peter Peterson"
        };
    }

    private async ensureDesignIsPrivate(designId: string, ownerId: string) {
        const isPublicDesign = ownerId == null;

        if (isPublicDesign) {
            this.logger.debug("Enter isPublicDesign branch");

            ownerId = "___system___"; // it can be any string that cannot be equal to a real user ID.

            const privateDesignCopy = await this.createPublicDesignCopy(designId, ownerId);
            designId = privateDesignCopy.id;
        }

        return { designId, ownerId };
    }

    private async checkDesignForProblems(designId: string, ownerId: string) {
        this.logger.debug(`Entered checkDesignForProblems for designId=${designId} ownerId=${ownerId}`);
        const privateDesignApiClient = await this.assetProcessorApi.buildPrivateDesignApiClient();
        const checkResult = await privateDesignApiClient.check(designId, undefined, ownerId);
        return checkResult;
    }

    private areProblemsDetected(checkResult: DesignProblemDto) {
        this.logger.debug(`Entered areProblemsDetected - ${JSON.stringify(checkResult)}`);
        return Object.values(checkResult).some(e => (Array.isArray(e) && e.length > 0) || (!Array.isArray(e) && e != null) );
    }

    private async createPublicDesignCopy(designId: string, targetOwnerId: string) {
        this.logger.debug(`Entered createPublicDesignCopy - copying designId=${designId} for ownerId=${targetOwnerId}`);
        const privateDesignApiClient = await this.assetProcessorApi.buildPrivateDesignApiClient();
        return await privateDesignApiClient.copyDesignFromPublicDesign(undefined, targetOwnerId, {
            publicDesignId: designId
        })
    }
}
