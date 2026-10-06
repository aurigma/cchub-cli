import { Command } from "commander";
import { inject, injectable } from "tsyringe";
import { CliOperationError, CliUsageError } from "../../cli/errors";
import { parseNonEmptyString, parseNonNegativeNumber, parsePositiveInteger } from "../../cli/option-parsers";
import { CalculatePriceUseCase } from "../../use-cases/products/calculate-price";
import { PriceView } from "../../views/price";

interface CalculateOptions {
    basePrice?: number;
    quantity: number;
    sku?: string;
    param: string[];
    productId?: number;
    productVersionId?: number;
    productVariantId?: number;
    json?: boolean;
}

@injectable()
export class PriceCommands {
    constructor(
        @inject(CalculatePriceUseCase) private readonly calculatePrice: CalculatePriceUseCase,
        @inject(PriceView) private readonly priceView: PriceView
    ) {}

    public addCli(parentCommand: Command): Command {
        const command = parentCommand.command("price").description("Calculates prices using Price Calculator");
        command.command("calculate")
            .description("Calculates the cost of one line item, including discounts and applied rules")
            .option("--base-price <number>", "Base unit price; defaults to the specified product variant's price", parseNonNegativeNumber)
            .option("-q, --quantity <number>", "Positive integer quantity", parsePositiveInteger, 1)
            .option("--sku <string>", "SKU; defaults to the specified product variant's SKU", parseNonEmptyString)
            .option("--param <key=value>", "Custom string parameter (repeatable; keys must be unique)",
                (value: string, previous: string[]) => [...previous, parseNonEmptyString(value)], [])
            .option("--product-id <number>", "Product ID", parsePositiveInteger)
            .option("--product-version-id <number>", "Product version ID; defaults to the version from product details", parsePositiveInteger)
            .option("--product-variant-id <number>", "Product variant ID", parsePositiveInteger)
            .option("--json", "Print the complete API response as JSON")
            .action(async (options: CalculateOptions) => { await this.calculate(options); });
        return command;
    }

    private async calculate(options: CalculateOptions): Promise<void> {
        const { productId, productVersionId, productVariantId } = options;
        const result = await this.calculatePrice.execute({
            basePrice: options.basePrice,
            quantity: options.quantity,
            sku: options.sku,
            customParameters: this.parseCustomParameters(options.param),
            productId,
            productVersionId,
            productVariantId
        });
        if (result.status === "base-price-required") {
            throw new CliUsageError("Provide --base-price or both --product-id and --product-variant-id to read the variant price.");
        }
        if (result.status === "variant-price-unavailable") {
            throw new CliOperationError(`Product ${result.productId}, variant ${result.productVariantId} has no valid non-negative price. Provide --base-price explicitly.`);
        }
        if (result.status === "product-version-unavailable") {
            throw new CliOperationError(`Product ${result.productId} has no valid version ID. Provide --product-version-id explicitly.`);
        }
        console.log(options.json
            ? this.priceView.calculationAsJson(result.price)
            : this.priceView.calculationAsTable(result.price, result.basePrice));
    }

    private parseCustomParameters(parameters: string[]): Record<string, string> | undefined {
        if (parameters.length === 0) {
            return undefined;
        }

        const customParameters: Record<string, string> = Object.create(null);
        for (const parameter of parameters) {
            const separator = parameter.indexOf("=");
            const key = parameter.slice(0, separator).trim();
            if (separator < 1 || !key) {
                throw new CliUsageError(`Invalid custom parameter "${parameter}". Expected key=value.`);
            }
            if (Object.prototype.hasOwnProperty.call(customParameters, key)) {
                throw new CliUsageError(`Duplicate custom parameter "${key}".`);
            }
            customParameters[key] = parameter.slice(separator + 1);
        }
        return customParameters;
    }
}
