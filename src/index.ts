import "reflect-metadata";
import { Command } from 'commander';

import dotenv from "dotenv";
import { StorefrontCommands } from "./commands/storefronts.js";
import { registerDependencies, container } from "./di/container.js";
import { PipelineCommands } from "./commands/pipelines.js";
import { ProjectCommands } from "./commands/projects.js";
import { GenerateCommands } from "./commands/generate.js";
import { AssetsCommands } from "./commands/assets.js";
import { Logger } from "winston";
import { AuthCommands } from "./commands/auth";
import packageMetadata from "../package.json";
import { handleCliError } from "./cli/error-handler";

async function main(): Promise<void> {
    dotenv.config();

    registerDependencies();

    const logger: Logger = container.resolve("Logger");
    const program = new Command();
    program.exitOverride();

    program
        .name(packageMetadata.name)
        .description(packageMetadata.description)
        .version(packageMetadata.version);

    container.resolve(StorefrontCommands).addCli(program);
    container.resolve(PipelineCommands).addCli(program);
    container.resolve(ProjectCommands).addCli(program);
    container.resolve(GenerateCommands).addCli(program);
    container.resolve(AssetsCommands).addCli(program);
    container.resolve(AuthCommands).addCli(program);

    try {
        await program.parseAsync();
    } catch (error) {
        handleCliError(error, logger);
    }
}

void main().catch((error) => {
    console.error("Failed to initialize CLI:", error);
    process.exitCode = 1;
});
