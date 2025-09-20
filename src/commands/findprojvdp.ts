import { container } from "tsyringe";
import { Logger } from "winston";
import { CCHubStorefrontApiService } from "../services/cchub-storefrontapi-service.js";
import { CCHubDesignAtomsApiService } from "../services/cchub-designatomsapi-service.js";
import { VdpDataModel } from "@aurigma/axios-design-atoms-api-client";

const logger = container.resolve<Logger>("Logger");

export interface FindProjectsVDPOptions {
    storefrontId: number,
    orderIds: string[]
}


export async function findProjectsVDP(options: FindProjectsVDPOptions): Promise<void> {
    const storefrontapi = container.resolve(CCHubStorefrontApiService);
    const designatomsapi = container.resolve(CCHubDesignAtomsApiService);

    const projects = (await Promise.all(options.orderIds
        .map(async x => await storefrontapi.getProjectsByOrderId(options.storefrontId, x))))
        .flat();

    logger.info(`Found ${projects.length} projects.`);

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
            vdp: await designatomsapi.getVdpData(x.designId, x.ownerId)
        })));

    data.forEach(x => logger.info(`Shopify order #${x.orderNumber}. Project ${x.id}. Design: ${x.designId} . Variables:\n ${visualizeVDP(x.vdp)}`))

}

function visualizeVDP(vdp: VdpDataModel) {
    if (!vdp || !vdp?.vdpDataSet) { 
        return "No variable data";
    }
    const data = vdp
        .vdpDataSet
        .surfacesData
        .map((x: any) => x.data)
        .flat()
        .map((x: any) => x.placeholders);

    return JSON.stringify(data, null, 4);
}