import "reflect-metadata";
import { Command } from 'commander';

import dotenv from "dotenv";
//import { findProjectsVDP, FindProjectsVDPOptions } from "./commands/findprojvdp.js";
import { StorefrontCommands } from "./commands/storefronts.js";
import { registerDependencies, container } from "./di/container.js";
import { PipelineCommands } from "./commands/pipelines.js";
import { ProjectCommands } from "./commands/projects.js";
import { Logger } from "winston";

registerDependencies();

dotenv.config();
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


/*
program.command('findprojvdp')
.description('Finds projects and their VDP data')
.option('-s, --storefrontId <number>', 'Storefront ID of the required store')
.option('-o, --orderIds <items>', 'Comma-separated list of ecommerce order IDs', commaSeparatedList)
.action((options: FindProjectsVDPOptions) => {
console.log(options);
findProjectsVDP(options);
});
*/

program.parse();