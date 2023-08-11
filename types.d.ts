interface CsvDataItem {
    x: number
    y: number
}
interface CsvDataRecords {
    meta: Record<string, string | number>
    data: Array<CsvDataItem>
}
interface CsvDataJson {
    name: string
    labels: string[]
    lines: number
    records: Array<CsvDataRecords>
}
