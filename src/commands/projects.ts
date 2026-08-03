import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { ProjectView } from '../views/project';
import { Command, Option } from 'commander';
import {
    DatePeriod,
    ProjectOutputFileDetailsDto,
    ProjectProcessingStatus,
} from '@aurigma/axios-storefront-api-client';
import { emptyState } from '../utils/chalks';
import { StorefrontApiClientBuilder } from '../services/storefront-api-client-builder';
import { AssetStorageApiClientBuilder } from '../services/asset-storage-api-client-builder';
import { saveFileResponseToDisk } from '../utils/save-file-response';
import { ProjectsCreateCommands } from './projects/create';

import { VdpDataModel } from "@aurigma/axios-design-atoms-api-client";
import { DesignAtomsApiClientBuilder } from '../services/design-atoms-api-client-builder';
import { parseCommaSeparatedList, parseNonEmptyString, parsePositiveInteger } from '../cli/option-parsers';

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
    outFile?: string;
}

interface ProjectProcessingStatusOptions {
    projectId: number;
    download?: boolean;
}


@injectable()
export class ProjectCommands {

    constructor(
        @inject(StorefrontApiClientBuilder) private readonly storefrontApi: StorefrontApiClientBuilder,
        @inject(DesignAtomsApiClientBuilder) private readonly designAtomsApi: DesignAtomsApiClientBuilder,
        @inject(AssetStorageApiClientBuilder) private readonly assetStorageApi: AssetStorageApiClientBuilder,
        @inject(ProjectsCreateCommands) private readonly createCommands: ProjectsCreateCommands,
        @inject(ProjectView) private readonly view: ProjectView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.storefrontApi = storefrontApi;
        this.assetStorageApi = assetStorageApi;
        this.createCommands = createCommands;
        this.view = view;
        this.logger = logger;
    }

    public addCli(parentCommand: Command) {
        const command = parentCommand.command("projects")
            .description('Allows to work with the tenant\'s projects');

        this.createCommands.addCli(command);

        command
            .command("get-design")
            .description('Download a design file from a specified project.')
            .requiredOption("-i, --projectId <number>", "A project ID where to extract a design.", parsePositiveInteger)
            .option("-o, --out-file <string>", "A location and file name to save it on a local machine. Omit it to use the design ID as a name.", parseNonEmptyString)
            .action(async (options: ProjectGetDesignOptions) => {
                this.logger.debug(`Entering "projects get-design" command. options=${JSON.stringify(options)}.`);
                await this.getDesignFromProject(options);
            })

        command
            .command("search")
            .description('Searches projects by order number, name, etc. (same as in BackOffice).')
            .requiredOption("-s, --storefrontId <number>", "A storefront ID.", parsePositiveInteger)
            .addOption(
                new Option("-p, --period <value>", "A period used to filter projects")
                    .choices(Object.values(DatePeriod))
                    .default(DatePeriod.Last30Days)
            )
            .argument("[searchString]", "A search string used to filter out projects.", "")
            .action(async (searchString?: string, options?: ProjectSearchOptions) => {
                this.logger.debug(`Entering "projects search" command. options=${JSON.stringify(options)}. Argument: ${searchString}`);
                if (options == null) throw new Error("StorefrontId and Period are not optional!");
                await this.listBySearchString(options, searchString);
            });

        command
            .command("view-vdp")
            .description('Searches projects by order number, name, etc. (same as in BackOffice).')
            .requiredOption("-s, --storefrontId <number>", "A storefront ID.", parsePositiveInteger)
            .requiredOption('-o, --orderIds <items>', 'Comma-separated list of ecommerce order IDs', parseCommaSeparatedList)
            .argument("[searchString]", "A search string used to filter out projects.", "")
            .action(async (searchString?: string, options?: FindProjectsVDPOptions) => {
                this.logger.debug(`Entering "projects search" command. options=${JSON.stringify(options)}. Argument: ${searchString}`);
                if (options == null) throw new Error("StorefrontId and OrderIds are not optional!");
                await this.findProjectsVDP(options);
            });

        command
            .command("processing-status")
            .description("Gets project processing status and output artifacts")
            .requiredOption("-i, --projectId <number>", "A project ID.", parsePositiveInteger)
            .option("--download", "Download completed output artifacts")
            .action(async (options: ProjectProcessingStatusOptions) => {
                this.logger.debug(`Entering "projects processing-status" command. options=${JSON.stringify(options)}.`);
                await this.getProjectProcessingStatus(options);
            });

        return command;
    }

    private async getProjectProcessingStatus(options: ProjectProcessingStatusOptions): Promise<void> {
        this.logger.debug(`Entered ProjectCommands.getProjectProcessingStatus. options=${JSON.stringify(options)}.`);

        const projectsClient = await this.storefrontApi.buildProjectsApiClient();
        const result = await projectsClient.getProjectProcessingResults(options.projectId, null, null);

        console.log(this.view.processingResults(result));

        if (result?.status === ProjectProcessingStatus.Completed) {
            const details = result.outputFileDetails ?? [];
            if (options.download) {
                await this.downloadOutputArtifacts(details);
            }
        }
    }

    private async downloadOutputArtifacts(details: ProjectOutputFileDetailsDto[]): Promise<void> {
        this.logger.debug(`Entered ProjectCommands.downloadOutputArtifacts. items=${details?.length ?? 0}.`);

        const artifactsClient = await this.assetStorageApi.buildArtifactsApiClient();
        const tenantId = this.assetStorageApi.getCurrentTenantId();

        for (const item of details) {
            const artifactId = item?.artifactId;
            if (!artifactId) {
                this.logger.warning("Skipping artifact download because artifactId is missing.");
                continue;
            }

            try {
                const artifact = await artifactsClient.get(artifactId, tenantId);
                let filename = artifact?.name?.trim() ? artifact.name.trim() : artifactId;
                if (artifact.format) {
                    filename += `.${artifact.format.toLowerCase()}`;
                }
                const file = await artifactsClient.getFile(artifactId, false, tenantId);
                await saveFileResponseToDisk(file, filename);
                this.logger.info(`Artifact downloaded: ${artifactId} -> ${filename}`);
            } catch (error) {
                this.logger.warn(`Failed to download artifact ${artifactId}. Error: ${error}`);
            }
        }
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
            .flat();
    }

    private async getDesignFromProject(options: ProjectGetDesignOptions) {
        const projectsClient = await this.storefrontApi.buildProjectsApiClient();

        const project = await projectsClient.get(options.projectId);
        const tenantId = this.storefrontApi.getCurrentTenantId();
        if (!project) {
            console.log(emptyState(`Project ${options.projectId} was not found for a tenant ${tenantId}`))
        }
        const projectLineItems = project.items ?? [];
        const designIds = projectLineItems.flatMap(x => x.designIds);
        const ownerId = project.ownerId;
        this.logger.info(`Found project ${project.id} for tenant ${tenantId}. Owner ID is ${ownerId}. Designs are ${designIds.join(", ")}`)

        const privateDesignClient = await this.assetStorageApi.buildPrivateDesignApiClient();

        const makeSeqFileName = (filename: string, seqNumber: number) =>
            filename
                .split(".")
                .map((x, index) => index == 0 && seqNumber > 0 ? x + "_" + String(seqNumber).padStart(3, "0") : x)
                .join(".");


        for (const [index, design] of designIds.entries()) {
            this.logger.debug(`Trying to fetch design ${design}...`);
            if (design == null) {
                throw new Error("Design ID cannot be blank.");
            }
            const file = await privateDesignClient.getFile(design, false, tenantId, ownerId);
            const filename = typeof options.outFile == 'string' ? makeSeqFileName(options.outFile, index) : design + ".st";
            try {
                await saveFileResponseToDisk(file, filename);
                this.logger.info(`Successfully saved file to ${filename}`);
            } catch (error) {
                this.logger.error(`Failed to fetch design ${design} and/or save a file to ${filename}. Error: ${error}`);
            }
        }
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
