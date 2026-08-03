import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";
import { CCHubConfiguration } from "../services/cchub-configuration";
import { CCHubAuth } from "../services/cchub-auth";
import winston from "winston";
import { StorefrontCommands } from "../commands/storefronts";
import { StorefrontView } from "../views/storefronts";
import { PipelineView } from "../views/pipeline";
import { ProjectCommands } from "../commands/projects";
import { PipelineCommands } from "../commands/pipelines";
import { AssetStorageApiClientBuilder } from "../services/asset-storage-api-client-builder";
import { AssetProcessorApiClientBuilder } from "../services/asset-processor-api-client-builder";
import { DesignAtomsApiClientBuilder } from "../services/design-atoms-api-client-builder";
import { StorefrontApiClientBuilder } from "../services/storefront-api-client-builder";
import { BackOfficeApiClientBuilder } from "../services/backoffice-api-client-builder";
import { ProjectView } from "../views/project";
import { GenerateCommands } from "../commands/generate";
import { DesignGenerator } from "../services/design-generator";
import { DesignSaveService } from "../services/design-save-service";
import { DesignDataSchemaService } from "../services/design-data-schema-service";
import { VdpDatasetCsvConverter } from "../services/vdp-dataset-csv-converter";
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
import { TokenStore } from "../services/token-store";
import { AuthCommands } from "../commands/auth";
import { AuthView } from "../views/auth";
import { OAuthLoopbackServer } from "../services/oauth-loopback-server";
import { AuthorizationCodeAuth } from "../services/authorization-code-auth";
import { CreateProjectThroughPipelineUseCase } from "../use-cases/projects/create-project-through-pipeline";
import { CreateProjectByRenderHiResUseCase } from "../use-cases/projects/create-project-by-render-hires";
import { ProjectCreationDesignPreparationService } from "../services/project-creation-design-preparation";

import { JsonProductSerializer } from "@aurigma/design-atoms/Serialization";

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
                    new winston.transports.Console()
                ]
            })
        });

    registerApiClientBuilders();
    registerServices();
    registerViews();
    registerCommands();

};

function registerViews() {
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

function registerCommands() {
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
