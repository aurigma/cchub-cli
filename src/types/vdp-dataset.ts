export interface VdpSurfaceBinding {
    surfaceIndexes: number[];
    isSingleBinding: boolean;
}

export interface VdpTextValue {
    text: string;
}

export interface VdpImageValue {
    image: string;
}

export type VdpCellValue = VdpTextValue | VdpImageValue | string | number | boolean | null | Record<string, unknown>;

export interface VdpDatasetRow {
    placeholders?: Record<string, string>;
    rootItems?: Record<string, VdpCellValue>;
    [key: string]: VdpCellValue | undefined;
}

export interface VdpSurfaceData {
    surfaceBinding?: VdpSurfaceBinding;
    data?: VdpDatasetRow[];
    iterateOverSurfacesFirst?: boolean;
    [key: string]: unknown;
}

export interface VdpDataSet {
    surfacesData?: VdpSurfaceData[];
    [key: string]: unknown;
}

export type DatasetOutputFormat = "json" | "csv" | "table";
