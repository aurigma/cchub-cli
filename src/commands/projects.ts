import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { ProjectView } from '../views/project';
import { Command } from 'commander';
import { DatePeriod } from '@aurigma/axios-storefront-api-client';
import { emptyState } from '../utils/chalks';
import { StorefrontApiClientBuilder } from '../services/storefront-api-client-builder';
import { AssetStorageApiClientBuilder } from 'src/services/asset-storage-api-client-builder';
import { createWriteStream } from 'fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

interface ProjectSearchOptions {
    storefrontId: number;
    period: DatePeriod;
}

interface ProjectGetDesignOptions {
    projectId: number;
    outFile: string | boolean;
}


@injectable()
export class ProjectCommands {

    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(AssetStorageApiClientBuilder) private readonly assetStorageApi: AssetStorageApiClientBuilder,
        @inject(ProjectView) private readonly view: ProjectView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.storefrontApi = storefrontApi;
        this.assetStorageApi = assetStorageApi;
        this.view = view;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("projects")
            .description('Allows to work with the tenant\'s projects');

        command
            .command("get-design")
            .description('Download a design file from a specified project.')
            .requiredOption("-i --projectId <number>", "A project ID where to extract a design.")
            .option("-o --out-file <string>", "A location and file name to save it on a local machine. Omit it to use the design ID as a name.", false)
            .action((options: ProjectGetDesignOptions) => {
                this.logger.debug(`Entering "projects get-design" command. options=${JSON.stringify(options)}.`);
                this.getDesignFromProject(options);
            })

        command
            .command("search")
            .description('Searches projects by order number, name, etc. (same as in BackOffice).')
            .requiredOption("-s --storefrontId <number>", "A storefront ID.")
            .option("-p --period <string>", "A period - All, Today, Last7Days or Last30Days (default).", DatePeriod.Last30Days)
            .argument("[searchString]", "A search string used to filter out projects.", "")
            .action(async (searchString?: string, options?: ProjectSearchOptions) => {
                this.logger.debug(`Entering "projects search" command. options=${JSON.stringify(options)}. Argument: ${searchString}`);
                await this.listBySearchString(options, searchString || null);
            });

        return command;
    }

    private async getDesignFromProject(options: ProjectGetDesignOptions) {
        const projectsClient = await this.storefrontApi.buildProjectsApiClient();

        const project = await projectsClient.get(options.projectId);
        const tenantId = this.storefrontApi.getCurrentTenantId();
        if (!project) {
            console.log(emptyState(`Project ${options.projectId} was not found for a tenant ${tenantId}`))
        }
        const designIds = project.items.flatMap(x => x.designIds);
        const ownerId = project.ownerId;
        this.logger.info(`Found project ${project.id} for tenant ${tenantId}. Owner ID is ${ownerId}. Designs are ${designIds.join(", ")}`)

        const privateDesignClient = await this.assetStorageApi.buildPrivateDesignApiClient();

        const makeSeqFileName = (filename: string, seqNumber: number) =>
            filename
                .split(".")
                .map((x, index) => index == 0 && seqNumber > 0 ? x + "_" + String(seqNumber).padStart(3, "0") : x)
                .join(".");
    

        designIds.forEach(async (design, index) => {
            this.logger.debug(`Trying to fetch design ${design}...`);
            const file = await privateDesignClient.getFile(design, false, tenantId, ownerId);
            const filename = typeof options.outFile == 'string' ? makeSeqFileName(options.outFile, index) : design + ".st";
            try {
                pipeline(Readable.from(file.data.stream()), createWriteStream(filename));
                this.logger.info(`Successfully saved file to ${filename}`);
            } catch (error) {
                this.logger.error(`Failed to fetch design ${design} and/or save a file to ${filename}. Error: ${error}`);
            }
        });
    }

    private async listBySearchString(options: ProjectSearchOptions, searchString?: string) {
        const projectsClient = await this.storefrontApi.buildProjectsApiClient();

        const projects = await projectsClient.getAll(
            null, // ownerId
            null, // productReference,
            null, // status
            options.period,
            null, // skip
            null, // take
            "Created DESC",
            searchString,
            null, // orderId
            null, // processingStatus
            false, // includeObsolete
            options.storefrontId
        );

        const tenantId = this.storefrontApi.getCurrentTenantId();
        this.logger.info(`Found ${projects.total} projects for tenant ${tenantId} at storefront ${options.storefrontId} for period ${options.period} matching the search string "${searchString}". `);

        console.log(this.view.listAsTable(projects.items ?? []));
    }

}
