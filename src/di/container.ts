import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";
import { CCHubConfiguration } from "../services/cchub-configuration";
import { CCHubAuth } from "../services/cchub-auth";
import { CCHubStorefrontApiService } from "../services/cchub-storefrontapi-service";
import { CCHubDesignAtomsApiService } from "../services/cchub-designatomsapi-service";
import { CCHubAssetProcessorService } from "../services/cchub-assetprocessor-service";
import winston from "winston";
import { StorefrontCommands } from "../commands/storefronts";
import { StorefrontView } from "src/views/storefronts";
import { PipelineView } from "src/views/pipeline";


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

    container.register(StorefrontView,
        { useClass: StorefrontView }
    );

    container.register(PipelineView,
        { useClass: PipelineView }
    );

    container.register(CCHubStorefrontApiService, {
        useClass: CCHubStorefrontApiService
    });

    container.register(CCHubDesignAtomsApiService, {
        useClass: CCHubDesignAtomsApiService
    });

    container.register(CCHubAssetProcessorService, {
        useClass: CCHubAssetProcessorService
    });


    container.register(StorefrontCommands, {
        useClass: StorefrontCommands
    });
};

export { registerDependencies, container };
