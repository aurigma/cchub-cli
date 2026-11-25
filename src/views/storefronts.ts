import { ListPresentation, TableListView } from "./list";
import { StorefrontDto } from "@aurigma/axios-storefront-api-client";
import { injectable } from "tsyringe";

export type StorefrontListRow = Pick<StorefrontDto, "id" | "name" | "type" | "created">;

@injectable()
export class StorefrontView extends TableListView<StorefrontListRow> implements ListPresentation<StorefrontListRow> {
    public readonly entityNamePlural = "storefronts";
    public readonly tableColumns = ["id", "name", "type", "created"] as const;
    public readonly csvColumns = this.tableColumns;
}
