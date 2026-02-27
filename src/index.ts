import "reflect-metadata";
import { Command } from 'commander';

import dotenv from "dotenv";
import { StorefrontCommands } from "./commands/storefronts.js";
import { registerDependencies, container } from "./di/container.js";
import { PipelineCommands } from "./commands/pipelines.js";
import { ProjectCommands } from "./commands/projects.js";
import { AssetsCommands } from "./commands/assets.js";
import { Logger } from "winston";

dotenv.config();

registerDependencies();

const logger: Logger = container.resolve("Logger");

function commaSeparatedList(value: string, _: any) {
    return value.split(',');
}

const program = new Command();

program
    .name('cchub-cli')
    .description('CLI for interacting with Customer\'s Canvas Hub')
    .version('1.0.0');

container.resolve(StorefrontCommands).addCli(program);
container.resolve(PipelineCommands).addCli(program);
container.resolve(ProjectCommands).addCli(program);
container.resolve(AssetsCommands).addCli(program);

program.parse();