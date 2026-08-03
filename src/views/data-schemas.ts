import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { dtoAsTable } from "../utils/dto-as-table";
import { formatByteSize } from "../utils/format-file-size";

export interface DataSchemaListRow {
    id?: string | null;
    name?: string | null;
    path?: string | null;
    size?: number | null;
    lastModifiedDate?: string | null;
}

@injectable()
export class DataSchemasView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(items: DataSchemaListRow[]): string {
        this.logger.debug(`Entered DataSchemasView.listAsTable. items=${items?.length ?? 0}.`);
        return dtoAsTable(
            items,
            ["id", "name", "size", "lastModifiedDate"],
            "data schemas",
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
