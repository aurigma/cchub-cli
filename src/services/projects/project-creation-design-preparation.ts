import { inject, injectable } from "tsyringe";
import { DesignProblemDto } from "@aurigma/axios-asset-processor-api-client";
import { AssetProcessorApiClientBuilder } from "../api/asset-processor-api-client-builder";

export interface ProjectCreationDesignPreparationInput {
    designId: string;
    ownerId?: string;
}

export type ProjectCreationDesignPreparationResult =
    | {
        status: "ready";
        designId: string;
        ownerId: string;
    }
    | {
        status: "design-problems";
        designId: string;
        ownerId: string;
        problems: DesignProblemDto;
    };

@injectable()
export class ProjectCreationDesignPreparationService {
    private static readonly publicDesignCopyOwnerId = "___system___";

    constructor(
        @inject(AssetProcessorApiClientBuilder) private readonly assetProcessorApi: AssetProcessorApiClientBuilder
    ) {}

    public async prepare(
        input: ProjectCreationDesignPreparationInput
    ): Promise<ProjectCreationDesignPreparationResult> {
        const privateDesignClient = await this.assetProcessorApi.buildPrivateDesignApiClient();
        let designId = input.designId;
        let ownerId = input.ownerId;

        if (ownerId == null) {
            ownerId = ProjectCreationDesignPreparationService.publicDesignCopyOwnerId;
            const privateDesignCopy = await privateDesignClient.copyDesignFromPublicDesign(undefined, ownerId, {
                publicDesignId: designId
            });

            if (privateDesignCopy.id == null) {
                throw new Error(`Private design copy for ${designId} has no id.`);
            }

            designId = privateDesignCopy.id;
        }

        const problems = await privateDesignClient.check(designId, undefined, ownerId);
        if (this.areProblemsDetected(problems)) {
            return {
                status: "design-problems",
                designId,
                ownerId,
                problems
            };
        }

        return {
            status: "ready",
            designId,
            ownerId
        };
    }

    private areProblemsDetected(problems: DesignProblemDto): boolean {
        return Object.values(problems).some(
            value => (Array.isArray(value) && value.length > 0) || (!Array.isArray(value) && value != null)
        );
    }
}
