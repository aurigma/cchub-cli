import { ListPresentation, TableListView } from "./list";
import { CsvColumn } from "../utils/csv";
import { injectable } from "tsyringe";
import { TableColumn } from "../utils/dto-as-table";
import { formatByteSize } from "../utils/format-file-size";
import { DesignProblemDto } from "@aurigma/axios-asset-processor-api-client";
import { error, success, warning } from "../utils/chalks";

export interface DesignListRow {
    id?: string | null;
    name?: string | null;
    path?: string | null;
    size?: number | null;
    lastModifiedDate?: string | null;
    hasProblems?: boolean | null;
}

@injectable()
export class DesignsView extends TableListView<DesignListRow> implements ListPresentation<DesignListRow> {
    public readonly entityNamePlural = "designs";
    public readonly tableColumns: readonly TableColumn<DesignListRow>[] = [
        "id", "name",
        { header: "size", value: row => row.size == null ? null : formatByteSize(row.size) },
        "hasProblems",
        { header: "lastModifiedDate", value: row => row.lastModifiedDate == null ? null : new Date(row.lastModifiedDate).toLocaleString() }
    ];
    public readonly csvColumns: readonly CsvColumn<DesignListRow>[] = ["id", "name", "path", "size", "hasProblems", "lastModifiedDate"];

    dataSchemaLinked(designId: string, schemaId: string): string {
        return success(`Data schema ${schemaId} linked to design ${designId}. No design problems detected.`);
    }

    dataSchemaLinkedWithProblems(designId: string, schemaId: string, problems: DesignProblemDto): string {
        const details = this.formatProblems(problems);
        return [
            warning(`Data schema ${schemaId} linked to design ${designId}, but the design contains problems.`),
            details.length > 0 ? details.join("\n") : warning("No problem details were returned by Asset Processor.")
        ].join("\n");
    }

    dataSchemaLinkedButCheckFailed(designId: string, schemaId: string): string {
        return error(`Data schema ${schemaId} was linked to design ${designId}, but problem details could not be retrieved.`);
    }

    invalidDataSchemaLinkArguments(): string {
        return error("Both design ID and data schema ID must be non-empty.");
    }

    dataSchemaLinkFailed(designId: string, schemaId: string): string {
        return error(`Failed to link data schema ${schemaId} to design ${designId}.`);
    }

    private formatProblems(problems: DesignProblemDto): string[] {
        const lines: string[] = [];

        for (const problem of problems.dataSchemaValidationProblems ?? []) {
            lines.push(warning(`Data schema: ${problem.itemName ?? "unknown item"} [${problem.validationRule ?? "unknown rule"}]${problem.reason ? `: ${problem.reason}` : ""}`));
        }
        if (problems.dataSchemaMissingProblem) {
            lines.push(warning(`Missing data schema: ${problems.dataSchemaMissingProblem.dataSchemaName ?? "unknown"}.`));
        }
        for (const problem of problems.fontMissingProblems ?? []) {
            lines.push(warning(`Missing font: ${problem.name ?? problem.postscriptName ?? "unknown"}.`));
        }
        for (const problem of problems.paletteMissingProblems ?? []) {
            lines.push(warning(`Missing palette: ${problem.paletteId ?? problem.paletteUID ?? "unknown"}.`));
        }
        for (const problem of problems.paletteValidationProblems ?? []) {
            lines.push(warning(`Invalid palette: ${problem.paletteId ?? problem.paletteUID ?? "unknown"}.`));
        }
        if (problems.toggleSetMissingProblem) {
            lines.push(warning(`Missing toggle set: ${problems.toggleSetMissingProblem.toggleSetName ?? "unknown"}.`));
        }
        if (problems.toggleSetValidationProblem) {
            lines.push(warning(`Invalid toggle set: ${problems.toggleSetValidationProblem.toggleSetName ?? "unknown"}.`));
        }

        return lines;
    }
}
