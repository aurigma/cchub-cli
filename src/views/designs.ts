import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { dtoAsTable } from "../utils/dto-as-table";
import { formatByteSize } from "../utils/format-file-size";

export interface DesignListRow {
    id?: string | null;
    name?: string | null;
    path?: string | null;
    size?: number | null;
    lastModifiedDate?: string | null;
    hasProblems?: boolean | null;
}

@injectable()
export class DesignsView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(items: DesignListRow[]): string {
        this.logger.debug(`Entered DesignsView.listAsTable. items=${items?.length ?? 0}.`);
        return dtoAsTable(
            items,
            ["id", "name", "size", "hasProblems", "lastModifiedDate"],
            "designs",
            (name: string, value: unknown) => {
                if (name === "size") {
                    return formatByteSize(Number(value));
                }
                if (name === "lastModifiedDate") {
                    return new Date(String(value)).toLocaleString();
                }
                return value;
            }
        );
    }
}
