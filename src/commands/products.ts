import { listFormatOption, ListFormatOptions } from "../cli/list-format-option";
import { ListView } from "../views/list";
import { Command } from "commander";
import { inject, injectable } from "tsyringe";
import { ProductsVariantsCommands } from "./products/variants";
import { PriceCommands } from "./products/price";
import { CliUsageError } from "../cli/errors";
import { parseNonEmptyString, parsePositiveInteger } from "../cli/option-parsers";
import { StorefrontApiClientBuilder } from "../services/api/storefront-api-client-builder";
import { ListProductsUseCase } from "../use-cases/products/list-products";
import { ProductListRow, ProductsView } from "../views/products";

interface GetProductOptions {
    productId: number;
    productVersionId?: number;
}

interface ListProductsOptions extends ListFormatOptions {
    tag: string[];
    customField: string[];
}

@injectable()
export class ProductsCommands {
    constructor(
        @inject(ProductsVariantsCommands) private readonly variantsCommands: ProductsVariantsCommands,
        @inject(PriceCommands) private readonly priceCommands: PriceCommands,
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(ProductsView) private readonly view: ProductsView,
        @inject("productsListView") private readonly listView: ListView<ProductListRow>,
        @inject(ListProductsUseCase) private readonly listProducts: ListProductsUseCase
    ) {}

    public addCli(parentCommand: Command): Command {
        const command = parentCommand.command("products").description("Allows to work with products");
        command.command("list")
            .addOption(listFormatOption())
            .description("Lists products with their personalization workflows and pipelines")
            .option("--tag <tag>", "Require a product tag (repeatable)",
                (value: string, previous: string[]) => [...previous, parseNonEmptyString(value)], [])
            .option("--custom-field <key=value>", "Filter by a custom field (repeatable)",
                (value: string, previous: string[]) => [...previous, parseNonEmptyString(value)], [])
            .action(async (options: ListProductsOptions) => { await this.list(options); });
        command.command("get")
            .description("Shows product details and storefront identifiers")
            .requiredOption("-p, --product-id <number>", "Product ID", parsePositiveInteger)
            .option("--product-version-id <number>", "Product version ID", parsePositiveInteger)
            .action(async (options: GetProductOptions) => { await this.get(options); });
        this.variantsCommands.addCli(command);
        this.priceCommands.addCli(command);
        return command;
    }

    private async list(options: ListProductsOptions): Promise<void> {
        const fields = new Map<string, string>();
        for (const entry of options.customField) {
            const separator = entry.indexOf("=");
            const key = separator < 0 ? "" : entry.slice(0, separator).trim();
            if (!key) {
                throw new CliUsageError("--custom-field requires key=value with a non-empty key");
            }
            if (fields.has(key)) {
                throw new CliUsageError(`--custom-field was specified more than once for "${key}"`);
            }
            fields.set(key, entry.slice(separator + 1));
        }
        const products = await this.listProducts.execute({
            tags: options.tag.length ? options.tag : undefined,
            customFields: fields.size ? Object.fromEntries(fields) : undefined
        });
        this.listView.print(products, options.format);
    }

    private async get(options: GetProductOptions): Promise<void> {
        const client = await this.storefrontApi.buildProductsApiClient();
        const product = await client.getProduct(options.productId, options.productVersionId);
        console.log(this.view.detailsAsTable(product));
    }
}
