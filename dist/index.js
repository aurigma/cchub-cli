"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const commander_1 = require("commander");
const dotenv_1 = __importDefault(require("dotenv"));
const storefronts_js_1 = require("./commands/storefronts.js");
const container_js_1 = require("./di/container.js");
const pipelines_js_1 = require("./commands/pipelines.js");
const projects_js_1 = require("./commands/projects.js");
dotenv_1.default.config();
(0, container_js_1.registerDependencies)();
const logger = container_js_1.container.resolve("Logger");
function commaSeparatedList(value, _) {
    return value.split(',');
}
const program = new commander_1.Command();
program
    .name('cchub-cli')
    .description('CLI for interacting with Customer\'s Canvas Hub')
    .version('1.0.0');
container_js_1.container.resolve(storefronts_js_1.StorefrontCommands).addCli(program);
container_js_1.container.resolve(pipelines_js_1.PipelineCommands).addCli(program);
container_js_1.container.resolve(projects_js_1.ProjectCommands).addCli(program);
program.parse();
//# sourceMappingURL=index.js.map