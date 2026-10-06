import { LineItemCostCalculationModel, LineItemCostDto } from "@aurigma/axios-price-calculator-api-client";
import { ProductsApiClient, ProductVariantDto } from "@aurigma/axios-storefront-api-client";
import { inject, injectable } from "tsyringe";
import { PriceCalculatorApiClientBuilder } from "../../services/api/price-calculator-api-client-builder";
import { StorefrontApiClientBuilder } from "../../services/api/storefront-api-client-builder";

export interface CalculatePriceInput {
    basePrice?: number;
    quantity: number;
    sku?: string;
    customParameters?: Record<string, string>;
    productId?: number;
    productVersionId?: number;
    productVariantId?: number;
}

type CalculatePriceFailure =
    | { status: "base-price-required" }
    | { status: "product-version-unavailable"; productId: number }
    | { status: "variant-price-unavailable"; productId: number; productVariantId: number };

export type CalculatePriceResult =
    | { status: "calculated"; price: LineItemCostDto; basePrice: number }
    | CalculatePriceFailure;

interface ResolvedProductContext {
    status: "resolved";
    productVersionId?: number;
    variant?: {
        productId: number;
        productVariantId: number;
        details: ProductVariantDto;
    };
}

interface ResolvedPricing {
    status: "resolved";
    basePrice: number;
    sku?: string;
}

@injectable()
export class CalculatePriceUseCase {
    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(PriceCalculatorApiClientBuilder) private readonly priceApi: PriceCalculatorApiClientBuilder
    ) {}

    public async execute(input: CalculatePriceInput): Promise<CalculatePriceResult> {
        const context = await this.resolveProductContext(input);
        if (context.status !== "resolved") {
            return context;
        }

        const pricing = this.resolvePricing(input, context);
        if (pricing.status !== "resolved") {
            return pricing;
        }

        const client = await this.priceApi.buildCostCalculationApiClient();
        const price = await client.calculateLineItemCost(this.buildCalculationModel(input, context, pricing));
        return { status: "calculated", price, basePrice: pricing.basePrice };
    }

    private async resolveProductContext(input: CalculatePriceInput): Promise<ResolvedProductContext | CalculatePriceFailure> {
        const { productId, productVariantId } = input;
        let { productVersionId } = input;
        if (input.basePrice === undefined && (productId === undefined || productVariantId === undefined)) {
            return { status: "base-price-required" };
        }

        let productsClient: ProductsApiClient | undefined;
        if (productId !== undefined && productVersionId === undefined) {
            productsClient = await this.storefrontApi.buildProductsApiClient();
            const product = await productsClient.getProduct(productId);
            if (product.productVersionId == null || !Number.isSafeInteger(product.productVersionId)
                || product.productVersionId <= 0) {
                return { status: "product-version-unavailable", productId };
            }
            productVersionId = product.productVersionId;
        }

        const context: ResolvedProductContext = { status: "resolved", productVersionId };
        if (productId !== undefined && productVariantId !== undefined
            && (input.basePrice === undefined || input.sku === undefined)) {
            productsClient ??= await this.storefrontApi.buildProductsApiClient();
            const details = await productsClient.getProductVariant(productId, productVariantId, productVersionId);
            context.variant = { productId, productVariantId, details };
        }
        return context;
    }

    private resolvePricing(input: CalculatePriceInput, context: ResolvedProductContext): ResolvedPricing | CalculatePriceFailure {
        const variant = context.variant;
        const basePrice = input.basePrice ?? variant?.details.price;
        if (input.basePrice === undefined && variant
            && (typeof basePrice !== "number" || !Number.isFinite(basePrice) || basePrice < 0)) {
            return {
                status: "variant-price-unavailable",
                productId: variant.productId,
                productVariantId: variant.productVariantId
            };
        }
        if (basePrice == null) {
            return { status: "base-price-required" };
        }
        return { status: "resolved", basePrice, sku: input.sku ?? variant?.details.sku ?? undefined };
    }

    private buildCalculationModel(
        input: CalculatePriceInput,
        context: ResolvedProductContext,
        pricing: ResolvedPricing
    ): LineItemCostCalculationModel {
        const { productId, productVariantId } = input;
        const { productVersionId } = context;
        return {
            basePrice: pricing.basePrice,
            quantity: input.quantity,
            sku: pricing.sku,
            customParameters: input.customParameters,
            productSpecifier: productId !== undefined || productVersionId !== undefined || productVariantId !== undefined
                ? { productId, productVersionId, productVariantId } : undefined
        };
    }
}
