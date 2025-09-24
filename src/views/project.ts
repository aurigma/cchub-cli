import { StorefrontDto } from "@aurigma/axios-storefront-api-client";
import { Logger } from "winston";
import { injectable, inject } from "tsyringe";
import { dtoAsTable } from "src/utils/dto-as-table";

@injectable()
export class ProjectView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(storefronts: StorefrontDto[]): string {
        this.logger.debug("Entered ProjectView.listAsTable");
        return dtoAsTable(storefronts, ['id', 'name', 'storefrontId', 'orderNumber', 'created'], 'projects');
    }
}