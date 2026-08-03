import { inject, injectable } from "tsyringe";
import { DesignProblemDto } from "@aurigma/axios-asset-processor-api-client";
import {
    CreateProjectByRenderHiResScenarioDto,
    OrderDetailsDto,
    ProjectDto,
    RenderHiResScenarioOutputColorSpace,
    RenderHiResScenarioOutputFlipMode,
    RenderHiResScenarioOutputFormat,
    RenderHiResScenarioOutputRotateMode
} from "@aurigma/axios-storefront-api-client";
import { ProjectCreationDesignPreparationService } from "../../services/project-creation-design-preparation";
import { StorefrontApiClientBuilder } from "../../services/storefront-api-client-builder";

export interface CreateProjectByRenderHiResInput {
    storefrontId: number;
    designId: string;
    ownerId?: string;
    name: string;
    description: string;
    orderDetails: OrderDetailsDto;
    outputFileName?: string;
    dpi?: number;
    format?: RenderHiResScenarioOutputFormat;
    colorSpace?: RenderHiResScenarioOutputColorSpace;
    flipMode?: RenderHiResScenarioOutputFlipMode;
    rotateMode?: RenderHiResScenarioOutputRotateMode;
    anonymousAccess?: boolean;
}

export type CreateProjectByRenderHiResResult =
    | {
        status: "created";
        project: ProjectDto;
    }
    | {
        status: "design-problems";
        designId: string;
        ownerId: string;
        problems: DesignProblemDto;
    };

@injectable()
export class CreateProjectByRenderHiResUseCase {
    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(ProjectCreationDesignPreparationService)
        private readonly designPreparation: ProjectCreationDesignPreparationService
    ) {}

    public async execute(input: CreateProjectByRenderHiResInput): Promise<CreateProjectByRenderHiResResult> {
        const designPreparation = await this.designPreparation.prepare(input);
        if (designPreparation.status === "design-problems") {
            return designPreparation;
        }

        const createDto: CreateProjectByRenderHiResScenarioDto = {
            ownerId: designPreparation.ownerId,
            name: input.name,
            description: input.description,
            orderDetails: input.orderDetails,
            scenario: {
                designId: designPreparation.designId,
                name: input.outputFileName ?? `file_${input.orderDetails.orderNumber}`,
                dpi: input.dpi,
                format: input.format,
                colorSpace: input.colorSpace,
                flipMode: input.flipMode,
                rotateMode: input.rotateMode,
                anonymousAccess: input.anonymousAccess ?? false
            }
        };

        const projectsClient = await this.storefrontApi.buildProjectsApiClient();
        const project = await projectsClient.createByRenderHiResScenario(input.storefrontId, null, createDto);

        return {
            status: "created",
            project
        };
    }
}
