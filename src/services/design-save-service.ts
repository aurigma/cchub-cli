import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { DesignAtomsApiClientBuilder } from "./design-atoms-api-client-builder";
import { NotImplementedError } from "../utils/errors";
import { saveFileResponseToDisk } from "../utils/save-file-response";

import { JsonProductSerializer } from "@aurigma/design-atoms/Serialization";
import { Product } from "@aurigma/design-atoms-model";
import { ProductProofFormat, ProductProofInterpolationMode } from "@aurigma/axios-design-atoms-api-client";

@injectable()
export class DesignSaveService {

    constructor(
        @inject(JsonProductSerializer) private readonly jsonProductSerializer: JsonProductSerializer,
        @inject(DesignAtomsApiClientBuilder) private readonly designAtomsApi: DesignAtomsApiClientBuilder,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.designAtomsApi = designAtomsApi;
        this.logger = logger;
    }

    public async saveAsPreview(product: Product, filename: string): Promise<void> {

        this.logger.debug(`Entered DesignSaveService.saveAsPreview. filename=${filename}`);

        const designAtomsService = await this.designAtomsApi.buildDesignAtomsServiceApiClient();
        const serializedProduct = this.serializeProduct(product);

        try {
            const resultFile = await designAtomsService.renderProduct(
                null,
                this.designAtomsApi.getCurrentTenantId(),
                {
                    product: serializedProduct,
                    renderingConfig: {
                        format: ProductProofFormat.Jpeg,
                        width: 800,
                        height: 800,
                        interpolationMode: ProductProofInterpolationMode.High,
                        surfaceIndex: 0,
                        safetyLinesEnabled: false,
                        watermarkEnabled: false,
                        watermarkOpacity: 0,
                        watermarkRepeat: false
                    }
                }
            );
            await saveFileResponseToDisk(resultFile, filename);

        } catch (e: any) 
        { 
            this.logger.error(e.toString())
            throw e;
        }
        this.logger.info(`Rendered a product.`);

        this.logger.info(`Preview file saved successfully to ${filename}`);
    }

    public async saveToCCHub(product: Product, filename: string, ownerId?: string) {
        this.logger.debug(`Entered DesignSaveService.saveToCCHub. filename=${filename}`);
        const designAtomsService = await this.designAtomsApi.buildDesignAtomsServiceApiClient();

        /*
            Here we create a public design template, so we don't specify the 
            owner ID, but specify a location (for simplicity - to the root).
         */
        const { id, name } = await designAtomsService.createDesign(ownerId, undefined, {
            product: this.serializeProduct(product),
            name: filename,
            path: "/"
        });

        if (ownerId) {
            this.logger.info(`Created a private design for ownerId=${ownerId} with id=${id} as ${name}`);
        }
        else {
            this.logger.info(`Created a public design with id=${id} as ${name}`);
        }

        return id;
    }

    private serializeProduct(product: Product): string {
        return JSON.parse(this.jsonProductSerializer.serialize(product));
    }
}
