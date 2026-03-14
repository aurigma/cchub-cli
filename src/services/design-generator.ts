import { inject, injectable } from "tsyringe";
import { Logger } from "winston";
import { DesignAtomsApiClientBuilder } from "./design-atoms-api-client-builder";
import { BoundedTextItem, CmykColor, Container, FirstBaselineOffset, ImageItem, LineItem, Matrix, PlainTextItem, PointF, PrintArea, Product, RectangleF, RgbColor, RgbColors, SizeF, Surface, Transform } from "@aurigma/design-atoms-model";
import { Margin } from "@aurigma/design-atoms-model/Math/Margin";
import { JsonProductSerializer } from "@aurigma/design-atoms/Serialization";
import { existsSync, readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { ItemType } from "@aurigma/axios-design-atoms-api-client";

@injectable()
export class DesignGenerator {
    constructor(
        @inject(DesignAtomsApiClientBuilder) private readonly designAtomsApi: DesignAtomsApiClientBuilder,
        @inject("Logger") private readonly logger: Logger,
        @inject(JsonProductSerializer) private readonly jsonProductSerializer: JsonProductSerializer
    ) {
        this.designAtomsApi = designAtomsApi;
        this.logger = logger;
    }

    public async generateHelloWorld(imageSource?: string): Promise<Product> {
        this.logger.debug("Entered DesignGenerator.generateHelloWorld.");

        // You may either put a plain non-formatted line:
        const textContent = "Hello world!";
        // or a formatted string: 
        // const textContent = `<p>Hello <span style="font-size: 20pt;all-caps:true">world!</span></p>`;
        //
        // See description of the text format at 
        // https://www.graphicsmill.com/docs/gm/advanced-formatted-text.htm


        /*
            For simplicity, let's assume that you have already uploaded 
            this font to your tenant (if not, this one can be found on 
            Google Fonts). 

            In real-life importing tool you will have to use AssetStorage
            to upload your fonts if they are missing. 
         */
        const fontPostscriptName = "Raleway-ExtraLight";
        const fontSize = 14;

        const textPosition = new PointF(30, 40);

        const helloWorldTextItem = new PlainTextItem(
            textContent,
            textPosition,
            fontPostscriptName,
            fontSize
        );

        // ICC profile should be available in the tenant (Assets > Color Profiles). 
        // Color components are bytes.

        const textColor = new CmykColor(255, 128, 64, 32, 255, "U.S. Web Coated (SWOP) v2");

        helloWorldTextItem.color = textColor;

        const product = this.buildBlankSinglePageProduct(5, 7, 0.125);

        /* 
            By default, we always add three default containers - backgound, 
            main and foreground. You almost always want to put items to the main 
            container.
        */
        const mainContainer = product.surfaces.get(0).containers.get(1);
        mainContainer.items.add(helloWorldTextItem);

        await this.tryAddImage(mainContainer, imageSource);
        this.addBoundedText(mainContainer,
            `<p><span style="ot:dlig">first official act</span></p>
            <p><span style=\"bold: true\">Lorum</span> ipsum</p>`,
            new RectangleF(20, 225, 400, 300),
            "IM_FELL_English_Roman",
            24
        );

        return product;
    }

    public generateVdpDesign() {

        // envelope #10 sized product
        const product = this.buildBlankSinglePageProduct(9.5, 4.125, 0);
        const mainContainer = product.surfaces.get(0).containers.get(1);

        const variablePlainText = new PlainTextItem(
            "Name",
            new PointF(48, 72),
            "Montserrat-SemiBold",
            36
        );

        variablePlainText.isVariable = true;
        variablePlainText.name = "Name";

        const interpolatedStringTextArea = new BoundedTextItem(
            "<p><span style='bold: true'>{{Company}}</span><br/><span>{{Address Line 1}}<br/>{{Address Line 2}}<br/>{{City}} {{State}},{{Zip}}</span></p>",
            new RectangleF(variablePlainText.baselineLocation.x, variablePlainText.baselineLocation.y + 36, 546, 144),
            "HelveticaNeueLTStd-Bd",
            16
        )

        mainContainer.items.add(variablePlainText);
        mainContainer.items.add(interpolatedStringTextArea);

        return product;
    }

    private addBoundedText(container: Container, content: string, bounds: RectangleF, postscriptName: string, fontSize: number) {
        const textElement = new BoundedTextItem(content, bounds, postscriptName, fontSize);
        textElement.firstBaselineMinOffset = 10;
        textElement.firstBaselineOffset = FirstBaselineOffset.EmboxHeight;

        textElement.borderWidth = 1;
        textElement.borderColor = RgbColors.black;

        const horizontalGap = 5;
        const measureLine = new LineItem(new PointF(bounds.left - horizontalGap, bounds.top), new PointF(bounds.left - horizontalGap, bounds.top + textElement.firstBaselineMinOffset));
        const measureLine2 = new LineItem(new PointF(bounds.left - horizontalGap * 2, bounds.top), new PointF(bounds.left - horizontalGap * 2, bounds.top + fontSize));

        container.items.add(textElement);
        container.items.add(measureLine);
        container.items.add(measureLine2);
    }

    private async tryAddImage(container: Container, imageSource: string) {
        if (!imageSource) return;

        const imageItem = await this.createImageItem(imageSource);
        // Move image to the right and down by 50 pixels
        imageItem.transform.applyMatrix(new Matrix(0.5, 0, 0, 0.25, 0, 0));

        container.items.add(imageItem);
    }

    private buildBlankSinglePageProduct(widthInch: number, heightInch: number, bleedInch: number): Product {
        /* 
            Default measurement unit in Design Atoms is *point* (pt).
            One point = 1/72 inch. 
            
            So if you need to build 5x7 inch card, you need to multiply each
            dimension by 72 (see inchToPoint private method below).
         */
        const pageBoundsInch = new RectangleF(0, 0, widthInch, heightInch);
        const pageBoundsPoints = this.inchToPoint(pageBoundsInch);

        const bleedPoints = bleedInch * 72;

        const printArea = new PrintArea(pageBoundsPoints, new Margin(bleedPoints));

        /*
            In theory, surface may be larger than PrintArea - e.g. if you have
            mockup images or several print areas per surface, but to keep things
            simpler, let's put the Surface = PrintArea.
        */
        const surface = new Surface(pageBoundsPoints.width, pageBoundsPoints.height, null, [printArea], null, "Front Side", true);
        const product = new Product([surface]);

        return product;
    }

    public createImageItem(source: string): Promise<ImageItem> {
        if (source.startsWith("http://") || source.startsWith("https://")) {
            this.logger.debug("Start create ImageItem by URL.");
            return this.createImageItemFromURL(source);
        } else if (existsSync(source)) {
            this.logger.debug("Start create ImageItem from file.");
            const fullPath = resolve(source);
            const fileData = readFileSync(fullPath);
            const imageFile = new File([fileData], basename(fullPath), { type: "image/png" });
            return this.createImageItemFromFile(imageFile);
        } else {
            this.logger.debug("Start create ImageItem by asset storage file id.");
            return this.createImageItemFromAssetStorage(source);
        }
    }

    private async createImageItemFromFile(image: File): Promise<ImageItem> {
        const designAtomsPrintProductItemsApiClient = await this.designAtomsApi.buildDesignAtomsPrintProductItemsApiClient();
        const formData = new FormData();
        formData.append("sourceFile", image, image.name);
        const tenantId = this.designAtomsApi.getCurrentTenantId();
        const imageItem = await designAtomsPrintProductItemsApiClient.createItemFromFile(ItemType.Image, tenantId, {
            data: new Blob([await image.arrayBuffer()]),
            fileName: image.name
        });

        return this.jsonProductSerializer.productParser.parseItem(imageItem) as ImageItem;
    }

    private async createImageItemFromURL(url: string): Promise<ImageItem> {
        const designAtomsPrintProductItemsApiClient = await this.designAtomsApi.buildDesignAtomsPrintProductItemsApiClient();

        const tenantId = this.designAtomsApi.getCurrentTenantId();
        const imageItem = await designAtomsPrintProductItemsApiClient.createItemFromUrl(ItemType.Image, tenantId, { url });

        return this.jsonProductSerializer.productParser.parseItem(imageItem) as ImageItem;
    }

    private async createImageItemFromAssetStorage(id: string): Promise<ImageItem> {
        const designAtomsPrintProductItemsApiClient = await this.designAtomsApi.buildDesignAtomsPrintProductItemsApiClient();

        const tenantId = this.designAtomsApi.getCurrentTenantId();
        const imageItem = await designAtomsPrintProductItemsApiClient.createItemFromStorage(ItemType.Image, tenantId, { sourceId: id });

        return this.jsonProductSerializer.productParser.parseItem(imageItem) as ImageItem;
    }

    private inchToPoint = (rect: RectangleF) =>
        new RectangleF((rect.left ?? 0) * 72, (rect.top ?? 0) * 72, (rect.width ?? 0) * 72, (rect.height ?? 0) * 72)
}
