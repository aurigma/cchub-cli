import { injectable } from "tsyringe";
import { dtoAsTable } from "../utils/dto-as-table";

interface PriceResult {
    price?: number;
    discount?: number;
    quantity?: number;
    totalPrice?: number;
    totalDiscount?: number;
    totalCost?: number;
    appliedPriceRules?: { id?: string; title?: string | null; number?: number; price?: number }[] | null;
    appliedDiscountRules?: { id?: string; title?: string | null; discount?: number }[] | null;
}

@injectable()
export class PriceView {
    public calculationAsTable(result: PriceResult, basePrice: number): string {
        const sections = [dtoAsTable([result], ["price", "discount", "quantity", "totalPrice", "totalDiscount", "totalCost"], "price calculations")];
        const priceRules = [
            { id: "—", title: "Base price", number: undefined, price: basePrice },
            ...(result.appliedPriceRules ?? [])
        ];
        sections.push("Applied price rules:",
            dtoAsTable(priceRules, ["id", "title", "number", "price"], "price rules"));
        if (result.appliedDiscountRules?.length) {
            sections.push("Applied discount rules:",
                dtoAsTable(result.appliedDiscountRules, ["id", "title", "discount"], "discount rules"));
        }
        return sections.join("\n");
    }

    public calculationAsJson(result: PriceResult): string {
        return JSON.stringify(result, null, 2);
    }
}
