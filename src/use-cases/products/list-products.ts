import { inject, injectable } from "tsyringe";
import { BackOfficeApiClientBuilder } from "../../services/api/backoffice-api-client-builder";

interface ProductAssociation {
    id: number;
    name?: string | null;
}

export interface ListedProduct {
    id?: number;
    name?: string | null;
    workflow?: ProductAssociation;
    pipeline?: ProductAssociation;
    tags?: string[] | null;
    customFields?: Record<string, string> | null;
}

interface ListProductsInput {
    tags?: string[];
    customFields?: Record<string, string>;
}

async function getAllPages<T>(
    fetchPage: (skip: number, take: number) => Promise<{ items?: T[] | null; total?: number }>
): Promise<T[]> {
    const take = 100;
    const items: T[] = [];
    while (true) {
        const page = await fetchPage(items.length, take);
        const batch = page.items ?? [];
        items.push(...batch);
        if (batch.length === 0 || (page.total != null ? items.length >= page.total : batch.length < take)) {
            return items;
        }
    }
}

@injectable()
export class ListProductsUseCase {
    constructor(
        @inject(BackOfficeApiClientBuilder) private readonly backOfficeApi: BackOfficeApiClientBuilder
    ) {}

    public async execute(input: ListProductsInput = {}): Promise<ListedProduct[]> {
        const client = await this.backOfficeApi.buildProductsManagementApiClient();
        const customFields = input.customFields ? JSON.stringify(input.customFields) : undefined;
        const products = await getAllPages((skip, take) =>
            client.getAllProducts(skip, take, undefined, undefined, undefined, input.tags, customFields)
        );
        if (products.length === 0) return [];

        const [workflows, pipelines] = await Promise.all([
            products.some(product => product.personalizationWorkflowId != null)
                ? getAllPages((skip, take) => client.getAvailablePersonalizationWorkflows(skip, take))
                : [],
            products.some(product => product.processingPipelineId != null)
                ? getAllPages((skip, take) => client.getAvailableProcessingPipelines(skip, take))
                : []
        ]);
        const workflowNames = new Map(workflows.map(workflow => [workflow.id, workflow.name]));
        const pipelineNames = new Map(pipelines.map(pipeline => [pipeline.id, pipeline.name]));

        return products.map(product => ({
            id: product.id,
            name: product.name,
            tags: product.tags,
            customFields: product.customFields,
            workflow: product.personalizationWorkflowId == null ? undefined : {
                id: product.personalizationWorkflowId,
                name: workflowNames.get(product.personalizationWorkflowId)
            },
            pipeline: product.processingPipelineId == null ? undefined : {
                id: product.processingPipelineId,
                name: pipelineNames.get(product.processingPipelineId)
            }
        }));
    }
}
