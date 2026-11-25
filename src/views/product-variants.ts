import { ListPresentation, TableListView } from "./list";
import { CsvColumn } from "../utils/csv";
import { injectable } from "tsyringe";
import { TableColumn } from "../utils/dto-as-table";

export interface ProductVariantRow {
    productVariantId?: number;
    productUid?: string | null;
    sku?: string | null;
    price?: number | null;
    weight?: number | null;
    isAvailable?: boolean;
    optionValues: ProductVariantOptionValue[];
}

interface ProductVariantOptionValue {
    optionId?: number | null;
    optionTitle?: string | null;
    valueTitle?: string | null;
}

interface ProductVariantTableRow extends ProductVariantRow {
    options: string;
}

@injectable()
export class ProductVariantsView extends TableListView<ProductVariantTableRow> implements ListPresentation<ProductVariantRow> {
    public readonly entityNamePlural = "product variants";
    public readonly tableColumns: readonly TableColumn<ProductVariantTableRow>[] = [
        "productVariantId", "productUid", "options",
        { header: "SKU", value: row => row.sku },
        { header: "Price", value: row => row.price },
        { header: "Weight", value: row => row.weight },
        { header: "Available", value: row => row.isAvailable == null ? null : row.isAvailable ? "Yes" : "No" }
    ];
    public readonly csvColumns: readonly CsvColumn<ProductVariantRow>[] = [
        "productVariantId", "productUid", "sku", "price", "weight", "isAvailable", "optionValues"
    ];

    public override listAsTable(items: readonly ProductVariantRow[]): string {
        const optionKey = (option: ProductVariantOptionValue): string => option.optionId != null
            ? `id:${option.optionId}` : `title:${option.optionTitle ?? ""}`;
        const options = new Map(items.flatMap(item => item.optionValues.map(option => [optionKey(option), option] as const)));
        const orderedKeys = [...options.entries()]
            .sort(([keyA, a], [keyB, b]) => {
                if (a.optionId != null && b.optionId != null) return a.optionId - b.optionId;
                if (a.optionId != null) return -1;
                if (b.optionId != null) return 1;
                return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
            })
            .map(([key]) => key);
        const rows = items.map(item => {
            const values = new Map(item.optionValues.map(option => [optionKey(option), option.valueTitle]));
            return {
                ...item,
                options: orderedKeys.length
                    ? orderedKeys.map(key => values.get(key)?.trim() || "N/A").join(" / ")
                    : "N/A"
            };
        });
        return super.listAsTable(rows);
    }
}
