import { ProcessingPipelineDto, StorefrontDto } from "@aurigma/axios-storefront-api-client";
import { Logger } from "winston";
import { injectable, inject } from "tsyringe";
import { dtoAsTable } from "../utils/dto-as-table";

@injectable()
export class PipelineView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(pipelines: ProcessingPipelineDto[]): string {
        return dtoAsTable(pipelines, ['id', 'name'], 'processing pipelines');
    }
}
