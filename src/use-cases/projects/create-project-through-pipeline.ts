import { inject, injectable } from "tsyringe";
import { DesignProblemDto } from "@aurigma/axios-asset-processor-api-client";
import {
    CreateProjectBySpecificPipelineScenarioDto,
    OrderDetailsDto,
    ProjectDto
} from "@aurigma/axios-storefront-api-client";
import { ProjectCreationDesignPreparationService } from "../../services/project-creation-design-preparation";
import { StorefrontApiClientBuilder } from "../../services/storefront-api-client-builder";

export interface CreateProjectThroughPipelineInput {
    storefrontId: number;
    designId: string;
    ownerId?: string;
    pipelineId: number;
    name: string;
    description: string;
    orderDetails: OrderDetailsDto;
}

export type CreateProjectThroughPipelineResult =
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
export class CreateProjectThroughPipelineUseCase {
    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(ProjectCreationDesignPreparationService)
        private readonly designPreparation: ProjectCreationDesignPreparationService
    ) {}

    public async execute(input: CreateProjectThroughPipelineInput): Promise<CreateProjectThroughPipelineResult> {
        const { name, description, orderDetails } = input;
        const designPreparation = await this.designPreparation.prepare(input);
        if (designPreparation.status === "design-problems") {
            return designPreparation;
        }

        const createDto: CreateProjectBySpecificPipelineScenarioDto = {
            ownerId: designPreparation.ownerId,
            name,
            description,
            orderDetails,
            items: [
                {
                    designIds: [designPreparation.designId],
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
                pipelineId: input.pipelineId
            }
        };

        const projectsClient = await this.storefrontApi.buildProjectsApiClient();
        const project = await projectsClient.createBySpecificPipelineScenario(input.storefrontId, null, createDto);

        return {
            status: "created",
            project
        };
    }

}
