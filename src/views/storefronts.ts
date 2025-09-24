import { StorefrontDto } from "@aurigma/axios-storefront-api-client";
import { Logger } from "winston";
import { injectable, inject } from "tsyringe";
import { dtoAsTable } from "src/utils/dto-as-table";

@injectable()
export class StorefrontView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(storefronts: StorefrontDto[]): string {
        return dtoAsTable(storefronts, ['id', 'name', 'type', 'created'], 'storefronts');
    }
}