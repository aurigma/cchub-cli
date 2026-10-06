import { injectable } from "tsyringe";
import { dtoAsTable } from "../utils/dto-as-table";
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

interface ProductVariantRow {
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

@injectable()
export class ProductsView {
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

    public variantsAsTable(items: ProductVariantRow[]): string {
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
                productVariantId: item.productVariantId,
                productUid: item.productUid,
                options: orderedKeys.length
                    ? orderedKeys.map(key => values.get(key)?.trim() || "N/A").join(" / ")
                    : "N/A",
                SKU: item.sku,
                Price: item.price,
                Weight: item.weight,
                Available: item.isAvailable == null ? "N/A" : item.isAvailable ? "Yes" : "No"
            };
        });
        return dtoAsTable(rows, ["productVariantId", "productUid", "options", "SKU", "Price", "Weight", "Available"], "product variants");
    }
}
