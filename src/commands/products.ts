import { Command } from "commander";
import { inject, injectable } from "tsyringe";
import { ProductsVariantsCommands } from "./products/variants";
import { PriceCommands } from "./products/price";
import { parsePositiveInteger } from "../cli/option-parsers";
import { StorefrontApiClientBuilder } from "../services/api/storefront-api-client-builder";
import { ProductsView } from "../views/products";

interface GetProductOptions {
    productId: number;
    productVersionId?: number;
}

@injectable()
export class ProductsCommands {
    constructor(
        @inject(ProductsVariantsCommands) private readonly variantsCommands: ProductsVariantsCommands,
        @inject(PriceCommands) private readonly priceCommands: PriceCommands,
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(ProductsView) private readonly view: ProductsView
    ) {}

    public addCli(parentCommand: Command): Command {
        const command = parentCommand.command("products").description("Allows to work with products");
        command.command("get")
            .description("Shows product details and storefront identifiers")
            .requiredOption("-p, --product-id <number>", "Product ID", parsePositiveInteger)
            .option("--product-version-id <number>", "Product version ID", parsePositiveInteger)
            .action(async (options: GetProductOptions) => { await this.get(options); });
        this.variantsCommands.addCli(command);
        this.priceCommands.addCli(command);
        return command;
    }

    private async get(options: GetProductOptions): Promise<void> {
        const client = await this.storefrontApi.buildProductsApiClient();
        const product = await client.getProduct(options.productId, options.productVersionId);
        console.log(this.view.detailsAsTable(product));
    }
}
