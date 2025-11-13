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

import { VdpDataModel } from "@aurigma/axios-design-atoms-api-client";
import { DesignAtomsApiClientBuilder } from 'src/services/design-atoms-api-client-builder';

interface ProjectSearchOptions {
    storefrontId: number;
    period: DatePeriod;
}

export interface FindProjectsVDPOptions {
    storefrontId: number,
    orderIds: string[]
}


interface ProjectGetDesignOptions {
    projectId: number;
    outFile: string | boolean;
}


@injectable()
export class ProjectCommands {

    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(DesignAtomsApiClientBuilder) private readonly designAtomsApi: DesignAtomsApiClientBuilder,
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

        command
            .command("view-vdp")
            .description('Searches projects by order number, name, etc. (same as in BackOffice).')
            .requiredOption("-s --storefrontId <number>", "A storefront ID.")
            .option('-o, --orderIds <items>', 'Comma-separated list of ecommerce order IDs', (val: string, _: any) => val.split(","))
            .argument("[searchString]", "A search string used to filter out projects.", "")
            .action(async (searchString?: string, options?: FindProjectsVDPOptions) => {
                this.logger.debug(`Entering "projects search" command. options=${JSON.stringify(options)}. Argument: ${searchString}`);
                await this.findProjectsVDP(options);
            });

        return command;
    }

    private async findProjectsVDP(options: FindProjectsVDPOptions): Promise<void> {
        const projectsClient = await this.storefrontApi.buildProjectsApiClient();
        const designAtomsServiceClient = await this.designAtomsApi.buildDesignAtomsServiceApiClient();


        const projects = (await Promise.all(options.orderIds
            .map(async x => await projectsClient.getAll(
                null, /* ownerId */
                null, /* productReference */
                null, /* status */
                DatePeriod.All, /* datePeriod */
                null, /* skip */
                null, /* take */
                "OrderId DESC", /* sorting */
                x, /* search */
                null, /* orderId */
                null, /* processingStatus */
                false, /* includeObsolete */
                options.storefrontId, /* storefrontId */))))
            .map(x => x.items ?? [])
            .flat();

        this.logger.info(`Found ${projects.length} projects.`);

        const data = await Promise.all(projects
            .map(x => ({
                id: String(x.id),
                orderNumber: x.orderNumber,
                ownerId: x.ownerId || "",
                designId: x.items?.map(x => x.designIds ?? []).flat()?.pop() || ""
            }))
            .map(async x => ({
                id: x.id,
                ownerId: x.ownerId,
                orderNumber: x.orderNumber,
                designId: x.designId,
                vdp: await designAtomsServiceClient.loadVdpData(x.designId, x.ownerId)
            })));

        data.forEach(
            x => {
                this.logger.info(`Shopify order #${x.orderNumber}. Project ${x.id}. Design: ${x.designId} .`)
                console.log(this.view.listVariables(this.getVdpData(x.vdp) ?? []));
            });
    }

    private getVdpData(vdp: VdpDataModel) {
        if (!vdp || !vdp?.vdpDataSet) {
            this.logger.warn("No variable data");
        }
        return vdp
            .vdpDataSet
            .surfacesData
            .map((x: any) => x.data)
            .flat()
            .map((x: any) => this.flattenStructure(x.rootItems));
    }

    private flattenStructure(vdpEntry: object) {
        const keys = Object.getOwnPropertyNames(vdpEntry);
        const result = {};
        keys.forEach(k => {
            result[k] = vdpEntry[k].text ?? vdpEntry[k].image ?? vdpEntry[k];
        });
        return result;
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
