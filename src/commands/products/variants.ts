import { listFormatOption, ListFormatOptions } from "../../cli/list-format-option";
import { ListView } from "../../views/list";
import { Command } from "commander";
import { inject, injectable } from "tsyringe";
import { parseNonNegativeInteger, parsePositiveInteger } from "../../cli/option-parsers";
import { StorefrontApiClientBuilder } from "../../services/api/storefront-api-client-builder";
import { ProductVariantRow } from "../../views/product-variants";

interface ListVariantsOptions extends ListFormatOptions {
    productId: number;
    productVersionId?: number;
    skip: number;
    take: number;
}

@injectable()
export class ProductsVariantsCommands {
    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject("productVariantsListView") private readonly listView: ListView<ProductVariantRow>
    ) {}

    public addCli(parentCommand: Command): Command {
        const command = parentCommand.command("variants").description("Allows to work with product variants");
        command.command("list")
            .addOption(listFormatOption())
            .description("Lists product variants with option values, SKU, price, weight, and availability")
            .requiredOption("-p, --product-id <number>", "Product ID", parsePositiveInteger)
            .option("--product-version-id <number>", "Product version ID", parsePositiveInteger)
            .option("-s, --skip <number>", "How many variants to skip", parseNonNegativeInteger, 0)
            .option("-t, --take <number>", "How many variants to take", parsePositiveInteger, 25)
            .action(async (options: ListVariantsOptions) => {
                await this.list(options);
            });
        return command;
    }

    private async list(options: ListVariantsOptions): Promise<void> {
        const client = await this.storefrontApi.buildProductsApiClient();
        const result = await client.getProductVariants(options.productId, options.productVersionId, options.skip, options.take);
        const rows: ProductVariantRow[] = (result.items ?? []).map(variant => ({
            productVariantId: variant.id,
            productUid: variant.uid,
            sku: variant.sku,
            price: variant.price,
            // The installed SDK does not declare weight; preserve it when returned by the server.
            weight: "weight" in variant && typeof variant.weight === "number" && Number.isFinite(variant.weight)
                ? variant.weight : undefined,
            isAvailable: variant.isAvailable,
            optionValues: (variant.productVariantOptions ?? []).map(option => ({
                optionId: option.productOptionId,
                optionTitle: option.productOptionTitle,
                valueTitle: option.productOptionValueTitle
            }))
        }));
        this.listView.print(rows, options.format);
    }
}
