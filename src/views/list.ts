import { stringify as stringifyYaml } from "yaml";
import { CsvColumn, stringifyCsv } from "../utils/csv";
import { dtoAsTable, TableColumn } from "../utils/dto-as-table";
import { ListFormat } from "../utils/list-format";

export abstract class TableListView<T extends object> {
    public abstract readonly entityNamePlural: string;
    public abstract readonly tableColumns: readonly TableColumn<T>[];

    public listAsTable(items: readonly T[]): string {
        return dtoAsTable(items, this.tableColumns, this.entityNamePlural);
    }
}

export interface ListPresentation<T> {
    listAsTable(items: readonly T[]): string;
    readonly csvColumns: readonly CsvColumn<T>[];
}

export class ListView<T extends object> {
    constructor(private readonly presentation: ListPresentation<T>) {}

    public print(items: readonly T[], format: ListFormat): void {
        switch (format) {
            case "table":
                console.log(this.presentation.listAsTable(items));
                break;
            case "json":
                console.log(JSON.stringify(items, null, 2));
                break;
            case "yaml":
                process.stdout.write(stringifyYaml(items));
                break;
            case "csv":
                console.log(stringifyCsv(items, this.presentation.csvColumns));
                break;
            default:
                throw new Error(`Unknown list format: ${format}`);
        }
    }
}
