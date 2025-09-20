import { inject, injectable } from 'tsyringe';
import { Logger } from "winston";
import { CCHubBackOfficeApiService } from "../services/cchub-backofficeapi-service";
import Table from 'cli-table3';
import { StorefrontView } from 'src/views/storefronts';

@injectable()
export class StorefrontCommands {

    constructor(
        @inject(CCHubBackOfficeApiService) private readonly backOfficeApi: CCHubBackOfficeApiService,
        @inject(StorefrontView) private readonly storefrontView: StorefrontView,
        @inject("Logger") private readonly logger: Logger
    ) {
        this.backOfficeApi = backOfficeApi;
        this.storefrontView = storefrontView;
        this.logger = logger;
    }

    public async list(searchString?: string) {
        const storefronts = await this.backOfficeApi.getStorefronts(searchString);
        const tenantId = this.backOfficeApi.getCurrentTenantId();
        this.logger.info(`Found ${storefronts.total} storefronts for tenant ${tenantId}. `);

        console.log(this.storefrontView.listAsTable(storefronts.items ?? []));
    }

}
