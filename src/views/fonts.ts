import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { dtoAsTable } from "../utils/dto-as-table";

export interface FontListRow {
    id?: string | null;
    name?: string | null;
    path?: string | null;
    postscriptName?: string | null;
    lastModified?: string | null;
}

@injectable()
export class FontsView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(fonts: FontListRow[]): string {
        this.logger.debug(`Entered FontsView.listAsTable. items=${fonts?.length ?? 0}.`);
        return dtoAsTable(fonts, ["id", "name", "postscriptName", "lastModified"], "fonts");
    }
}
