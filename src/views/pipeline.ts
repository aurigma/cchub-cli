import { ListPresentation, TableListView } from "./list";
import { ProcessingPipelineDto } from "@aurigma/axios-storefront-api-client";
import { injectable } from "tsyringe";

export type PipelineListRow = Pick<ProcessingPipelineDto, "id" | "name">;

@injectable()
export class PipelineView extends TableListView<PipelineListRow> implements ListPresentation<PipelineListRow> {
    public readonly entityNamePlural = "processing pipelines";
    public readonly tableColumns = ["id", "name"] as const;
    public readonly csvColumns = this.tableColumns;
}
