import "reflect-metadata";
import { container, InjectionToken, Lifecycle } from "tsyringe";
import { CCHubConfiguration } from "../config/cchub-configuration";
import { CCHubAuth } from "../services/auth/cchub-auth";
import winston from "winston";
import { StorefrontCommands } from "../commands/storefronts";
import { StorefrontView } from "../views/storefronts";
import { PipelineView } from "../views/pipeline";
import { ProjectCommands } from "../commands/projects";
import { PipelineCommands } from "../commands/pipelines";
import { AssetStorageApiClientBuilder } from "../services/api/asset-storage-api-client-builder";
import { AssetProcessorApiClientBuilder } from "../services/api/asset-processor-api-client-builder";
import { DesignAtomsApiClientBuilder } from "../services/api/design-atoms-api-client-builder";
import { StorefrontApiClientBuilder } from "../services/api/storefront-api-client-builder";
import { BackOfficeApiClientBuilder } from "../services/api/backoffice-api-client-builder";
import { ProjectView } from "../views/project";
import { GenerateCommands } from "../commands/generate";
import { DesignGenerator } from "../services/designs/design-generator";
import { DesignSaveService } from "../services/designs/design-save-service";
import { DesignDataSchemaService } from "../services/designs/design-data-schema-service";
import { VdpDatasetCsvConverter } from "../services/vdp/vdp-dataset-csv-converter";
import { AssetsCommands } from "../commands/assets";
import { AssetsDesignsCommands } from "../commands/assets/designs";
import { AssetsFontsCommands } from "../commands/assets/fonts";
import { AssetsPrivateDesignsCommands } from "../commands/assets/private-designs";
import { DesignsView } from "../views/designs";
import { FontsView } from "../views/fonts";
import { PrivateDesignsView } from "../views/private-designs";
import { DataSchemasView } from "../views/data-schemas";
import { AssetsDataSchemasCommands } from "../commands/assets/data-schemas";
import { ProjectsCreateCommands } from "../commands/projects/create";
import { TokenStore } from "../services/auth/token-store";
import { AuthCommands } from "../commands/auth";
import { AuthView } from "../views/auth";
import { OAuthLoopbackServer } from "../services/auth/oauth-loopback-server";
import { AuthorizationCodeAuth } from "../services/auth/authorization-code-auth";
import { CreateProjectThroughPipelineUseCase } from "../use-cases/projects/create-project-through-pipeline";
import { CreateProjectByRenderHiResUseCase } from "../use-cases/projects/create-project-by-render-hires";
import { ProjectCreationDesignPreparationService } from "../services/projects/project-creation-design-preparation";

import { JsonProductSerializer } from "@aurigma/design-atoms/Serialization";
import { PriceCommands } from "../commands/products/price";
import { PriceView } from "../views/price";
import { PriceCalculatorApiClientBuilder } from "../services/api/price-calculator-api-client-builder";
import { ProductsCommands } from "../commands/products";
import { ProductsVariantsCommands } from "../commands/products/variants";
import { ProductsView } from "../views/products";
import { CalculatePriceUseCase } from "../use-cases/products/calculate-price";
import { ListProductsUseCase } from "../use-cases/products/list-products";

import { ListPresentation, ListView } from "../views/list";
import { ProductVariantsView } from "../views/product-variants";

const registerDependencies = () => {

    container.register(
        "Logger",
        {
            useValue: winston.createLogger({
                level: process.env["APP_LOGLEVEL"] ?? "debug",
                format: winston.format.combine(
                    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                    winston.format.colorize(),
                    winston.format.splat(),
                    winston.format.printf(({ timestamp, level, message }) => {
                        return `${timestamp} ${level}: ${message}`;
                    }),
                    winston.format.errors({ stack: true })
                ),
                transports: [
                    new winston.transports.Console({ stderrLevels: Object.keys(winston.config.npm.levels) })
                ]
            })
        });

    registerApiClientBuilders();
    registerServices();
    registerViews();
    registerCommands();

};

function registerViews() {
    container.register(ProductVariantsView, { useClass: ProductVariantsView });
    registerListView("productsListView", ProductsView);
    registerListView("productVariantsListView", ProductVariantsView);
    registerListView("pipelinesListView", PipelineView);
    registerListView("storefrontsListView", StorefrontView);
    registerListView("projectsListView", ProjectView);
    registerListView("fontsListView", FontsView);
    registerListView("designsListView", DesignsView);
    registerListView("dataSchemasListView", DataSchemasView);
    registerListView("privateDesignsListView", PrivateDesignsView);

    container.register(ProductsView, { useClass: ProductsView });
    container.register(PriceView, { useClass: PriceView });
    container.register(StorefrontView,
        { useClass: StorefrontView }
    );

    container.register(PipelineView,
        { useClass: PipelineView }
    );

    container.register(ProjectView,
        { useClass: ProjectView }
    );

    container.register(FontsView,
        { useClass: FontsView }
    );

    container.register(DesignsView,
        { useClass: DesignsView }
    );

    container.register(PrivateDesignsView,
        { useClass: PrivateDesignsView }
    );

    container.register(DataSchemasView,
        { useClass: DataSchemasView }
    );

    container.register(AuthView,
        { useClass: AuthView }
    );
}

function registerListView<T extends object>(
    token: string,
    presentation: InjectionToken<ListPresentation<T>>
): void {
    container.register<ListView<T>>(token, {
        useFactory: dependencyContainer => new ListView(dependencyContainer.resolve(presentation))
    });
}

function registerCommands() {
    container.register(ProductsCommands, { useClass: ProductsCommands });
    container.register(ProductsVariantsCommands, { useClass: ProductsVariantsCommands });
    container.register(PriceCommands, { useClass: PriceCommands });
    container.register(StorefrontCommands, {
        useClass: StorefrontCommands
    });

    container.register(PipelineCommands, {
        useClass: PipelineCommands
    });

    container.register(ProjectCommands, {
        useClass: ProjectCommands
    });

    container.register(GenerateCommands, {
        useClass: GenerateCommands
    });

    container.register(AssetsCommands, {
        useClass: AssetsCommands
    });

    container.register(AssetsDesignsCommands, {
        useClass: AssetsDesignsCommands
    });

    container.register(AssetsFontsCommands, {
        useClass: AssetsFontsCommands
    });

    container.register(AssetsPrivateDesignsCommands, {
        useClass: AssetsPrivateDesignsCommands
    });

    container.register(AssetsDataSchemasCommands, {
        useClass: AssetsDataSchemasCommands
    });

    container.register(ProjectsCreateCommands, {
        useClass: ProjectsCreateCommands
    });

    container.register(AuthCommands, {
        useClass: AuthCommands
    });
}

function registerApiClientBuilders() {
    container.register(PriceCalculatorApiClientBuilder, { useClass: PriceCalculatorApiClientBuilder });
    container.register(AssetStorageApiClientBuilder, {
        useClass: AssetStorageApiClientBuilder
    });

    container.register(AssetProcessorApiClientBuilder, {
        useClass: AssetProcessorApiClientBuilder
    });

    container.register(DesignAtomsApiClientBuilder, {
        useClass: DesignAtomsApiClientBuilder
    });

    container.register(StorefrontApiClientBuilder, {
        useClass: StorefrontApiClientBuilder
    });

    container.register(BackOfficeApiClientBuilder, {
        useClass: BackOfficeApiClientBuilder
    });
}

function registerServices() {
    container.register(CalculatePriceUseCase, { useClass: CalculatePriceUseCase });
    container.register(ListProductsUseCase, { useClass: ListProductsUseCase });
    container.register(
        CCHubConfiguration,
        { useClass: CCHubConfiguration },
        { lifecycle: Lifecycle.Singleton }
    );

    container.register(CCHubAuth,
        { useClass: CCHubAuth },
        { lifecycle: Lifecycle.Singleton }
    );

    container.register(TokenStore,
        { useClass: TokenStore },
        { lifecycle: Lifecycle.Singleton }
    );

    container.register(OAuthLoopbackServer,
        { useClass: OAuthLoopbackServer },
        { lifecycle: Lifecycle.Singleton }
    );

    container.register(AuthorizationCodeAuth,
        { useClass: AuthorizationCodeAuth },
        { lifecycle: Lifecycle.Singleton }
    );

    container.register(CreateProjectThroughPipelineUseCase, {
        useClass: CreateProjectThroughPipelineUseCase
    });

    container.register(CreateProjectByRenderHiResUseCase, {
        useClass: CreateProjectByRenderHiResUseCase
    });

    container.register(ProjectCreationDesignPreparationService, {
        useClass: ProjectCreationDesignPreparationService
    });

    container.registerInstance(JsonProductSerializer, new JsonProductSerializer())

    container.register(DesignGenerator, {
        useClass: DesignGenerator
    });

    container.register(DesignSaveService, {
        useClass: DesignSaveService
    });

    container.register(DesignDataSchemaService, {
        useClass: DesignDataSchemaService
    });

    container.register(VdpDatasetCsvConverter, {
        useClass: VdpDatasetCsvConverter
    });
}



export { registerDependencies, container };
