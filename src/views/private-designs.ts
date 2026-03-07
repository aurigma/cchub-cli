import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { dtoAsTable } from "../utils/dto-as-table";
import { formatByteSize } from "../utils/format-file-size";

export interface PrivateDesignListRow {
    id?: string | null;
    name?: string | null;
    ownerId?: string | null;
    size?: number | null;
    lastModified?: string | null;
}

@injectable()
export class PrivateDesignsView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(items: PrivateDesignListRow[]): string {
        this.logger.debug(`Entered PrivateDesignsView.listAsTable. items=${items?.length ?? 0}.`);
        return dtoAsTable(
            items, 
            ["id", "name", "ownerId", "size", "lastModified"], 
            "private designs", 
            (name: string, value: number) => name == "size" ? formatByteSize(value) : value);
    }
}
