import "reflect-metadata";
import { Command } from 'commander';

import dotenv from "dotenv";
//import { findProjectsVDP, FindProjectsVDPOptions } from "./commands/findprojvdp.js";
import { StorefrontCommands } from "./commands/storefronts.js";
import { registerDependencies, container } from "./di/container.js";
import { PipelineCommands } from "./commands/pipelines.js";

registerDependencies();

dotenv.config();

const program = new Command();
function commaSeparatedList(value: string, _: any) {
    return value.split(',');
}

program
    .name('cchub-cli')
    .description('CLI for interacting with Customer\'s Canvas Hub')
    .version('1.0.0');

program.command("storefronts")
    .description('Allows to work with storefronts')
    .command("list")
    .argument("[searchString]", "A search string used to filter out storefronts (by name - partial)")
    .action((searchString: string) => {
        const commands = container.resolve(StorefrontCommands);
        commands.list(searchString);
    })

program.command("pipelines")
    .description('Allows to get information about rendering pipelines')
    .command("list")
    .argument("[searchString]", "A search string used to filter out storefronts (by name - partial)")
    .action((searchString: string) => {
        const commands = container.resolve(PipelineCommands);
        commands.list(searchString);
    })

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