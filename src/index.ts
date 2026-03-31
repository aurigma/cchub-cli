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

dotenv.config();

registerDependencies();

const logger: Logger = container.resolve("Logger");

const program = new Command();

program
    .name('cchub-cli')
    .description('CLI for interacting with Customer\'s Canvas Hub')
    .version('1.0.0');

container.resolve(StorefrontCommands).addCli(program);
container.resolve(PipelineCommands).addCli(program);
container.resolve(ProjectCommands).addCli(program);
container.resolve(GenerateCommands).addCli(program);
container.resolve(AssetsCommands).addCli(program);
container.resolve(AuthCommands).addCli(program);

program.parse();
