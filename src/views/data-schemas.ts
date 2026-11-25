import { ListPresentation, TableListView } from "./list";
import { CsvColumn } from "../utils/csv";
import { injectable } from "tsyringe";
import { TableColumn } from "../utils/dto-as-table";
import { formatByteSize } from "../utils/format-file-size";

export interface DataSchemaListRow {
    id?: string | null;
    name?: string | null;
    path?: string | null;
    size?: number | null;
    lastModifiedDate?: string | null;
}

@injectable()
export class DataSchemasView extends TableListView<DataSchemaListRow> implements ListPresentation<DataSchemaListRow> {
    public readonly entityNamePlural = "data schemas";
    public readonly tableColumns: readonly TableColumn<DataSchemaListRow>[] = [
        "id", "name",
        { header: "size", value: row => row.size == null ? null : formatByteSize(row.size) },
        { header: "lastModifiedDate", value: row => row.lastModifiedDate == null ? null : new Date(row.lastModifiedDate).toLocaleString() }
    ];
    public readonly csvColumns: readonly CsvColumn<DataSchemaListRow>[] = ["id", "name", "path", "size", "lastModifiedDate"];
}
