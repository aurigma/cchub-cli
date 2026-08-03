import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { Command, Option } from "commander";
import {
    OrderDetailsDto,
    RenderHiResScenarioOutputColorSpace,
    RenderHiResScenarioOutputFlipMode,
    RenderHiResScenarioOutputFormat,
    RenderHiResScenarioOutputRotateMode
} from "@aurigma/axios-storefront-api-client";
import { ProjectView } from "../../views/project";
import { parseNonEmptyString, parsePositiveInteger } from "../../cli/option-parsers";
import { CreateProjectThroughPipelineUseCase } from "../../use-cases/projects/create-project-through-pipeline";
import { CreateProjectByRenderHiResUseCase } from "../../use-cases/projects/create-project-by-render-hires";
import { CliOperationError } from "../../cli/errors";

interface ProjectCreateRenderHiresOptions {
    storefrontId: number;
    designId: string;
    ownerId?: string;
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
    ownerId?: string;
    pipelineId: number;
}

@injectable()
export class ProjectsCreateCommands {
    constructor(
        @inject(CreateProjectByRenderHiResUseCase) private readonly createProjectByRenderHiRes: CreateProjectByRenderHiResUseCase,
        @inject(CreateProjectThroughPipelineUseCase) private readonly createProjectThroughPipeline: CreateProjectThroughPipelineUseCase,
        @inject(ProjectView) private readonly view: ProjectView,
        @inject("Logger") private readonly logger: Logger
    ) {
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
            .requiredOption("-s --storefrontId <number>", "A storefront ID.", parsePositiveInteger)
            .requiredOption("-d --designId <string>", "A private design ID.", parseNonEmptyString)
            .option("-o --ownerId <string>", "A private design owner ID. If omitted, it is considered that designId is a public design (a copy is created).", parseNonEmptyString)
            .option("--outputFileName <string>", "Render scenario output name", parseNonEmptyString)
            .option("--dpi <number>", "Output DPI", parsePositiveInteger, 300)
            .addOption(
                new Option("--format <value>", "Output format")
                    .choices(Object.values(RenderHiResScenarioOutputFormat))
                    .default(RenderHiResScenarioOutputFormat.Pdf)
            )
            .addOption(
                new Option("--colorSpace <value>", "Output color space")
                    .choices(Object.values(RenderHiResScenarioOutputColorSpace))
                    .default(RenderHiResScenarioOutputColorSpace.Cmyk)
            )
            .addOption(
                new Option("--flipMode <value>", "Output flip mode")
                    .choices(Object.values(RenderHiResScenarioOutputFlipMode))
                    .default(RenderHiResScenarioOutputFlipMode.None)
            )
            .addOption(
                new Option("--rotateMode <value>", "Output rotate mode")
                    .choices(Object.values(RenderHiResScenarioOutputRotateMode))
                    .default(RenderHiResScenarioOutputRotateMode.None)
            )
            .option("--anonymousAccess", "Enable anonymous access for rendered result")
            .action(async (options: ProjectCreateRenderHiresOptions) => {
                this.logger.debug(`Entering "projects create render-hires" command. options=${JSON.stringify(options)}.`);
                await this.createByRenderHiresScenario(options);
            });

        command
            .command("through-pipeline")
            .description("Creates a project by running a specified order processing pipeline")
            .requiredOption("-s, --storefrontId <number>", "A storefront ID.", parsePositiveInteger)
            .requiredOption("-d, --designId <string>", "A private design ID.", parseNonEmptyString)
            .requiredOption("-p, --pipelineId <number>", "A pipeline ID.", parsePositiveInteger)
            .option("-o, --ownerId <string>", "A private design owner ID. If omitted, it is considered that designId is a public design (a copy is created).", parseNonEmptyString)
            .action(async (options: ProjectCreatePipelineOptions) => {
                this.logger.debug(`Entering "projects create through-pipeline" command. options=${JSON.stringify(options)}.`);
                await this.createByPipelineScenario(options);
            });

        return command;
    }

    private async createByRenderHiresScenario(options: ProjectCreateRenderHiresOptions) {
        this.logger.debug(`Entered ProjectsCreateCommands.createByRenderHiresScenario. options=${JSON.stringify(options)}.`);

        const result = await this.createProjectByRenderHiRes.execute({
            ...options,
            name: new Date().toISOString(),
            description: "Created through cchub-cli tool (render-hires)",
            orderDetails: this.generateRandomOrderDetails()
        });

        if (result.status === "design-problems") {
            this.logger.warn(`Design ${result.designId} for ${result.ownerId} contains some issues`);
            console.log(this.view.visualizeDesignProblems(result.problems));
            throw new CliOperationError("Project was not created because the design contains problems.");
        }

        console.log(this.view.createdProjectAsTable(result.project));
        this.logger.info(`Project created by render-hires. id=${result.project.id}, name=${result.project.name}, status=${result.project.status}, processingStatus=${result.project.processingStatus}.`);
    }

    private async createByPipelineScenario(options: ProjectCreatePipelineOptions) {
        this.logger.debug(`Entered ProjectsCreateCommands.createByPipelineScenario. options=${JSON.stringify(options)}.`);

        const result = await this.createProjectThroughPipeline.execute({
            ...options,
            name: new Date().toISOString(),
            description: "Created through cchub-cli tool (through-pipeline)",
            orderDetails: this.generateRandomOrderDetails()
        });

        if (result.status === "design-problems") {
            this.logger.warn(`Design ${result.designId} for ${result.ownerId} contains some issues`);
            console.log(this.view.visualizeDesignProblems(result.problems));
            throw new CliOperationError("Project was not created because the design contains problems.");
        }

        console.log(this.view.createdProjectAsTable(result.project));
        this.logger.info(`Project created through a pipeline ${options.pipelineId}. id=${result.project.id}, name=${result.project.name}, status=${result.project.status}, processingStatus=${result.project.processingStatus}.`);
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

}
