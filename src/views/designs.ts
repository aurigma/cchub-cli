import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { dtoAsTable } from "../utils/dto-as-table";
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
