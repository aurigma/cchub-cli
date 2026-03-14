import { ProjectDto, ProjectOutputFileDetailsDto, ProjectProcessingResultsDto, ProjectProcessingStatus, StorefrontDto } from "@aurigma/axios-storefront-api-client";
import { Logger } from "winston";
import { injectable, inject } from "tsyringe";
import { dtoAsTable } from "../utils/dto-as-table";
import { formatByteSize } from "../utils/format-file-size";
import { success, error, msg } from "src/utils/chalks";
import { DesignProblemDto } from "@aurigma/axios-asset-processor-api-client";
import chalk from "chalk";

@injectable()
export class ProjectView {
    constructor(
        @inject("Logger") private readonly logger: Logger
    ) {
        this.logger = logger;
    }

    listAsTable(storefronts: StorefrontDto[]): string {
        this.logger.debug("Entered ProjectView.listAsTable");
        return dtoAsTable(storefronts, ['id', 'name', 'storefrontId', 'orderNumber', 'created'], 'projects');
    }

    listVariables(vdpFields: object[]) {
        this.logger.debug("Entered ProjectView.listVariables");
        return dtoAsTable(vdpFields, Object.getOwnPropertyNames(vdpFields[0] ?? {}), "variables");
    }

    createdProjectAsTable(project: ProjectDto): string {
        this.logger.debug(`Entered ProjectView.createdProjectAsTable. id=${project?.id}.`);
        return dtoAsTable([project], ["id", "name", "status", "processingStatus"], "projects");
    }

    visualizeDesignProblems(checkResults: DesignProblemDto) {
        return Object
            .entries(checkResults)
            .filter(entry => entry[1] != null && (Array.isArray(entry[1]) && entry[1].length > 0))
            .map(entry => `${chalk.bold(entry[0])}\n\n${this.formatValue(entry[1])}\n`)
            .reduce((acc, cur) => acc + "\n" + cur + "\n", "")
    }

    processingResults(result: ProjectProcessingResultsDto): string {
        this.logger.debug(`Entered ProjectView.processingResults. status=${result?.status}.`);

        let output = `Status: ${this.formatProcessingStatus(result?.status)}`;
        if (result?.statusDescription && result?.status != result?.statusDescription) {
            output += `\n${result.statusDescription}`;
        }

        if (result?.status === ProjectProcessingStatus.Completed) {
            output += `\n${this.processingOutputFilesAsTable(result.outputFileDetails ?? [])}`;

            const urls = result.outputFileDetails.filter(x => x.anonymousAccess).map(x => x.url);
            if (urls.length > 0) {
                output += "\nDownload URLs: \n- " + urls.join('\n- ');
            }
        }

        return output;
    }

    private formatValue(value: any) {
        switch(true) {
            case Array.isArray(value): 
                return value.map(x => this.formatValue(x)).join("\n- ");
            case typeof value === "object":
                return JSON.stringify(value);
            default:
                return value.toLocaleString();
        }
    }

    private formatProcessingStatus(status: ProjectProcessingStatus) {
        switch (status) {
            case ProjectProcessingStatus.Completed:
                return success(status);
            case ProjectProcessingStatus.Failed:
                return error(status);
            default:
                return msg(status);
        }
    }

    processingOutputFilesAsTable(files: ProjectOutputFileDetailsDto[]): string {
        this.logger.debug(`Entered ProjectView.processingOutputFilesAsTable. items=${files?.length ?? 0}.`);
        return dtoAsTable(
            files,
            ["name", "size", "format", "artifactId", "anonymousAccess"],
            "project output files",
            (name: string, value: unknown) => name === "size" ? formatByteSize(Number(value)) : value
        );
    }
}
