import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { dtoAsTable } from "../utils/dto-as-table";
import { formatByteSize } from "../utils/format-file-size";
import { VariableInfo } from "@aurigma/axios-design-atoms-api-client";
import { emptyState, success } from "src/utils/chalks";
import { VdpDatasetCsvConverter } from "../services/vdp-dataset-csv-converter";
import { DatasetOutputFormat, VdpDataSet } from "../types/vdp-dataset";

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
        @inject(VdpDatasetCsvConverter) private readonly vdpDatasetCsvConverter: VdpDatasetCsvConverter,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    variables(variables: VariableInfo[]) {
        if (variables.length == 0) {
            return emptyState("No variables detected in this design");
        }

        return dtoAsTable(variables, ["name", "type", "value"], "variables");
    }

    dataset(dataset: VdpDataSet | null, output: DatasetOutputFormat): string {
        if (this.isEmptyDataset(dataset)) {
            return emptyState("Dataset is empty");
        }

        switch (output) {
            case "json":
                return JSON.stringify(dataset, null, 2);
            case "csv":
                return this.vdpDatasetCsvConverter.vdpDataSetToCsv(dataset);
            case "table":
                return this.datasetAsTable(dataset);
            default:
                return JSON.stringify(dataset, null, 2);
        }
    }

    datasetUpdated(): string {
        return success("Dataset updated");
    }

    listAsTable(items: PrivateDesignListRow[]): string {
        this.logger.debug(`Entered PrivateDesignsView.listAsTable. items=${items?.length ?? 0}.`);
        return dtoAsTable(
            items, 
            ["id", "name", "ownerId", "size", "lastModified"], 
            "private designs", 
            (name: string, value: number) => name == "size" ? formatByteSize(value) : value);
    }

    private datasetAsTable(dataset: VdpDataSet | null): string {
        const flatRows = this.vdpDatasetCsvConverter.vdpDataSetToFlatRows(dataset);
        if (flatRows.length === 0) {
            return emptyState("Dataset is empty");
        }

        const headers = this.collectHeaders(flatRows);
        if (headers.length === 0) {
            return emptyState("Dataset is empty");
        }

        return dtoAsTable(flatRows, headers, "dataset rows");
    }

    private collectHeaders(rows: Record<string, string>[]): string[] {
        const headers = new Set<string>();
        rows.forEach(x => Object.keys(x).forEach(y => headers.add(y)));
        return Array.from(headers);
    }

    private isEmptyDataset(dataset: VdpDataSet | null): boolean {
        if (dataset === null || dataset === undefined) {
            return true;
        }

        const surfacesData = dataset.surfacesData ?? [];
        if (surfacesData.length === 0) {
            return true;
        }

        const hasRows = surfacesData.some(x => Array.isArray(x?.data) && x.data.length > 0);
        return !hasRows;
    }
}
