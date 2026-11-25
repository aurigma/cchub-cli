import { ListPresentation, TableListView } from "./list";
import { CsvColumn } from "../utils/csv";
import { injectable } from "tsyringe";

export interface FontListRow {
    id?: string | null;
    name?: string | null;
    path?: string | null;
    postscriptName?: string | null;
    lastModified?: string | null;
}

@injectable()
export class FontsView extends TableListView<FontListRow> implements ListPresentation<FontListRow> {
    public readonly entityNamePlural = "fonts";
    public readonly tableColumns = ["id", "name", "postscriptName", "lastModified"] as const;
    public readonly csvColumns: readonly CsvColumn<FontListRow>[] = ["id", "name", "path", "postscriptName", "lastModified"];
}
