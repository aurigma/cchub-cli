import { ListPresentation, TableListView } from "./list";
import { CsvColumn } from "../utils/csv";
import { injectable } from "tsyringe";
import { TableColumn } from "../utils/dto-as-table";
import Table from "cli-table3";

interface ProductDetails {
    id?: number;
    productVersionId?: number;
    name?: string | null;
    description?: string | null;
    created?: string;
    lastModified?: string | null;
    storefrontId?: number | null;
    storefrontProductId?: string | null;
    storefrontProductName?: string | null;
}

export interface ProductListRow {
    id?: number;
    name?: string | null;
    workflow?: { id: number; name?: string | null };
    pipeline?: { id: number; name?: string | null };
    tags?: string[] | null;
    customFields?: Record<string, string> | null;
}

function formatAssociation(association: ProductListRow["workflow"]): string | undefined {
    if (association == null) return undefined;
    return association.name?.trim() ? `${association.name} (${association.id})` : String(association.id);
}

@injectable()
export class ProductsView extends TableListView<ProductListRow> implements ListPresentation<ProductListRow> {
    public readonly entityNamePlural = "products";
    public readonly tableColumns: readonly TableColumn<ProductListRow>[] = [
        { header: "ID", value: product => product.id },
        { header: "Name", value: product => product.name },
        { header: "Personalization Workflow", value: product => formatAssociation(product.workflow) },
        { header: "Pipeline", value: product => formatAssociation(product.pipeline) },
        { header: "Tags", value: product => product.tags?.join(", ").replace(/\r\n|[\r\n]/g, " ") || undefined },
        {
            header: "Custom Fields",
            value: product => Object.entries(product.customFields ?? {})
                .map(([key, value]) => `${key}=${value}`)
                .join(", ")
                .replace(/\r\n|[\r\n]/g, " ") || undefined
        }
    ];
    public readonly csvColumns: readonly CsvColumn<ProductListRow>[] = [
        "id", "name",
        { header: "workflow.id", value: product => product.workflow?.id },
        { header: "workflow.name", value: product => product.workflow?.name },
        { header: "pipeline.id", value: product => product.pipeline?.id },
        { header: "pipeline.name", value: product => product.pipeline?.name },
        "tags", "customFields"
    ];

    public detailsAsTable(product: ProductDetails): string {
        const fields: (keyof ProductDetails)[] = [
            "id", "productVersionId", "name", "description", "created", "lastModified",
            "storefrontId", "storefrontProductId", "storefrontProductName"
        ];
        const table = new Table({ head: ["Field", "Value"], colWidths: [25, 80], wordWrap: true });
        for (const field of fields) {
            table.push([field, product[field] == null ? "N/A" : String(product[field])]);
        }
        return table.toString();
    }
}
