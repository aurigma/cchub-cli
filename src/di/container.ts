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
    registerViews();
    registerCommands();

    // Регистрация сервисов
    container.register(
        CCHubConfiguration,
        { useClass: CCHubConfiguration },
        { lifecycle: Lifecycle.Singleton }
    );

    container.register(CCHubAuth,
        { useClass: CCHubAuth },
        { lifecycle: Lifecycle.Singleton }
    );
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



export { registerDependencies, container };
