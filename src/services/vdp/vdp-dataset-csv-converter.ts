import { injectable } from "tsyringe";
import { VariableInfo, VdpDataModel } from "@aurigma/axios-design-atoms-api-client";
import { parseCsvToObjects } from "../../utils/csv";
import { VdpDataSet, VdpDatasetRow, VdpSurfaceData } from "../../types/vdp-dataset";

type CsvRow = Record<string, string>;
type VdpRow = VdpDatasetRow;
type VariableTypeMap = Record<string, string>;

interface CsvValueStrategy {
    canHandle(context: CsvValueContext): boolean;
    apply(context: CsvValueContext): void;
}

interface CsvValueContext {
    variableName: string;
    variableType?: string;
    value: string;
    targetRow: VdpRow;
}

@injectable()
export class VdpDatasetCsvConverter {
    private readonly csvValueStrategies: CsvValueStrategy[] = [
        new InStringStrategy(),
        new ImageStrategy(),
        new TextStrategy()
    ];

    public csvToVdpData(
        csv: string,
        variables: VariableInfo[],
        currentVdpData?: VdpDataModel | null
    ): VdpDataModel {
        const variableTypes = this.buildVariableTypeMap(variables);
        const rows = parseCsvToObjects(csv);
        const csvRows = rows.map(x => this.toVdpRow(x, variableTypes));
        const hasCurrentData = currentVdpData !== null && currentVdpData !== undefined;
        const vdpRows = hasCurrentData ? [...this.extractCurrentRows(currentVdpData), ...csvRows] : csvRows;
        return this.composeVdpData(vdpRows, currentVdpData);
    }

    public vdpDataSetToCsv(vdpDataSet: VdpDataSet | null | undefined): string {
        return this.composeCsv(this.vdpDataSetToFlatRows(vdpDataSet));
    }

    public vdpDataSetToFlatRows(vdpDataSet: VdpDataSet | null | undefined): CsvRow[] {
        const rows = this.extractVdpRows(vdpDataSet);
        return rows.map(x => this.toCsvRow(x));
    }

    private buildVariableTypeMap(variables: VariableInfo[]): VariableTypeMap {
        const map: VariableTypeMap = {};
        variables.forEach(x => this.tryAddVariable(map, x));
        return map;
    }

    private tryAddVariable(map: VariableTypeMap, variable: VariableInfo): void {
        const name = variable.name?.trim();
        if (name) {
            map[name] = variable.type ?? "";
        }
    }

    private toVdpRow(csvRow: CsvRow, variableTypes: VariableTypeMap): VdpRow {
        const row: VdpRow = {};
        Object.entries(csvRow).forEach(([name, value]) => this.tryApplyValue(name, value, variableTypes, row));
        return row;
    }

    private tryApplyValue(name: string, value: string, types: VariableTypeMap, row: VdpRow): void {
        const variableName = name.trim();
        if (!variableName || !types[variableName]) {
            return;
        }
        const context = this.createContext(variableName, value, types, row);
        this.resolveCsvValueStrategy(context).apply(context);
    }

    private createContext(variableName: string, value: string, types: VariableTypeMap, row: VdpRow): CsvValueContext {
        return { variableName, variableType: types[variableName], value, targetRow: row };
    }

    private resolveCsvValueStrategy(context: CsvValueContext): CsvValueStrategy {
        return this.csvValueStrategies.find(x => x.canHandle(context)) ?? this.csvValueStrategies[this.csvValueStrategies.length - 1];
    }

    private composeVdpData(vdpRows: VdpRow[], current?: VdpDataModel | null): VdpDataModel {
        const firstSurface = this.extractFirstSurface(current);
        const surface = this.composeSurfaceData(vdpRows, firstSurface);
        return { vdpDataSet: { surfacesData: [surface] }, vdpItemsData: current?.vdpItemsData ?? null };
    }

    private extractCurrentRows(current?: VdpDataModel | null): VdpRow[] {
        if (!current?.vdpDataSet) {
            return [];
        }
        return this.extractVdpRows(current.vdpDataSet);
    }

    private extractFirstSurface(current?: VdpDataModel | null): VdpSurfaceData | null {
        const surface = current?.vdpDataSet?.surfacesData?.[0];
        return surface && typeof surface === "object" ? surface as VdpSurfaceData : null;
    }

    private composeSurfaceData(vdpRows: VdpRow[], firstSurface: VdpSurfaceData | null): VdpSurfaceData {
        const surface: VdpSurfaceData = { data: vdpRows };
        surface.surfaceBinding = firstSurface?.surfaceBinding ?? { surfaceIndexes: [0], isSingleBinding: false };
        surface.iterateOverSurfacesFirst = firstSurface?.iterateOverSurfacesFirst ?? false;

        return surface;
    }

    private extractVdpRows(vdpDataSet: VdpDataSet | null | undefined): VdpRow[] {
        const surfaces = this.extractSurfaces(vdpDataSet);
        return surfaces.flatMap(x => this.readSurfaceRows(x));
    }

    private extractSurfaces(vdpDataSet: VdpDataSet | null | undefined): VdpSurfaceData[] {
        if (!vdpDataSet) {
            return [];
        }

        const surfaces = vdpDataSet.surfacesData;
        return Array.isArray(surfaces) ? surfaces.filter(x => this.isObject(x)) as VdpSurfaceData[] : [];
    }

    private readSurfaceRows(surface: VdpSurfaceData): VdpRow[] {
        const data = surface.data;
        if (!Array.isArray(data)) {
            return [];
        }

        return data.filter(x => this.isObject(x)) as VdpRow[];
    }

    private toCsvRow(vdpRow: VdpRow): CsvRow {
        const csvRow: CsvRow = {};
        Object.entries(vdpRow).forEach(([name, value]) => this.writeValueToCsv(csvRow, name, value));
        return csvRow;
    }

    private writeValueToCsv(csvRow: CsvRow, name: string, value: unknown): void {
        if (name === "placeholders") {
            this.writePlaceholders(csvRow, value);
            return;
        }
        if (name === "rootItems") {
            return;
        }
        csvRow[name] = this.extractScalarValue(value);
    }

    private writePlaceholders(csvRow: CsvRow, value: unknown): void {
        if (!this.isObject(value)) {
            return;
        }
        Object.entries(value).forEach(([name, placeholderValue]) => {
            csvRow[name] = String(placeholderValue ?? "");
        });
    }

    private extractScalarValue(value: unknown): string {
        if (this.hasProperty(value, "text")) {
            return String((value as { text?: unknown }).text ?? "");
        }
        if (this.hasProperty(value, "image")) {
            return String((value as { image?: unknown }).image ?? "");
        }
        return typeof value === "string" ? value : JSON.stringify(value ?? null);
    }

    private composeCsv(rows: CsvRow[]): string {
        if (rows.length === 0) {
            return "";
        }
        const headers = this.collectHeaders(rows);
        const bodyRows = rows.map(x => this.toCsvLine(headers.map(h => x[h] ?? "")));
        return [this.toCsvLine(headers), ...bodyRows].join("\n");
    }

    private collectHeaders(rows: CsvRow[]): string[] {
        const headers = new Set<string>();
        rows.forEach(x => Object.keys(x).forEach(y => headers.add(y)));
        return Array.from(headers);
    }

    private toCsvLine(values: string[]): string {
        return values.map(x => this.escapeCsv(x)).join(",");
    }

    private escapeCsv(value: string): string {
        const escaped = value.replace(/"/g, "\"\"");
        return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
    }

    private isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null;
    }

    private hasProperty(value: unknown, property: string): boolean {
        return this.isObject(value) && property in value;
    }
}

class InStringStrategy implements CsvValueStrategy {
    public canHandle(context: CsvValueContext): boolean {
        return context.variableType === "InString";
    }

    public apply(context: CsvValueContext): void {
        const placeholders = this.ensurePlaceholders(context.targetRow);
        placeholders[context.variableName] = context.value;
    }

    private ensurePlaceholders(row: VdpRow): Record<string, string> {
        if (!this.hasPlaceholders(row)) {
            row.placeholders = {};
        }
        return row.placeholders as Record<string, string>;
    }

    private hasPlaceholders(row: VdpRow): boolean {
        return typeof row.placeholders === "object" && row.placeholders !== null;
    }
}

class ImageStrategy implements CsvValueStrategy {
    public canHandle(context: CsvValueContext): boolean {
        return this.isImageValue(context.value);
    }

    public apply(context: CsvValueContext): void {
        context.targetRow[context.variableName] = { image: context.value };
    }

    private isImageValue(value: string): boolean {
        return value.startsWith("public:") || value.startsWith("user:") || /^https?:\/\//.test(value);
    }
}

class TextStrategy implements CsvValueStrategy {
    public canHandle(): boolean {
        return true;
    }

    public apply(context: CsvValueContext): void {
        context.targetRow[context.variableName] = { text: context.value };
    }
}
