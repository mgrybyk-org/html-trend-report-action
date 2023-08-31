import * as fs from 'fs/promises'
import * as path from 'path'
import csvtojson from 'csvtojson'
import { isFileExist } from './isFileExists.js'
import { chartReport } from './report_chart.js'

const csvExt = '.csv'

export const csvReport = async (
    sourceReportDir: string,
    reportBaseDir: string,
    reportId: string,
    meta: Record<string, string | number>
) => {
    const dataFile = `${reportBaseDir}/data.json`
    let csvJson: CsvJson

    if (await isFileExist(dataFile)) {
        csvJson = JSON.parse((await fs.readFile(dataFile)).toString('utf-8'))
    } else {
        csvJson = { data: [], title: reportId }
    }
    const dataJson = csvJson.data

    if (!(await isFileExist(sourceReportDir))) {
        throw new Error('report_dir cannot be found: ' + sourceReportDir)
    }
    const filesContent: Array<{ name: string; json: Array<Record<string, string | number>> }> = []
    if (sourceReportDir.toLowerCase().endsWith(csvExt)) {
        const json = await csvtojson().fromFile(sourceReportDir)
        filesContent.push({ name: path.basename(sourceReportDir, path.extname(sourceReportDir)), json })
    } else {
        const csvFiles = (await fs.readdir(sourceReportDir, { withFileTypes: true })).filter(
            (f) => f.isFile() && path.extname(f.name) === csvExt
        )

        for (const csvFile of csvFiles) {
            const json = await csvtojson().fromFile(path.join(sourceReportDir, csvFile.name))
            filesContent.push({ name: path.basename(csvFile.name, csvExt), json })
        }
    }

    const x = Date.now()
    filesContent
        // skip empty files
        .filter((d) => {
            if (d.json.length > 0) {
                return true
            }
            console.log('csv: empty file', d.name)
            return false
        })
        // convert values to numbers
        .map((d) => {
            Object.entries(d.json[0]).forEach(([k, v]) => {
                d.json[0][k] = parseFloat(v as string)
            })
            return d
        })
        // skip invalid input where values are not numbers
        .filter((d) => {
            const isNotNumber = Object.values(d.json[0]).some((v) => !Number.isFinite(v))
            if (isNotNumber) {
                console.log('csv: only number values are supported', d.name, d.json[0])
            }
            return !isNotNumber
        })
        .forEach((d) => {
            if (d.json.length > 1) {
                console.log('csv: only one values row is allowed!')
            }

            const labels = Object.keys(d.json[0])
            let entry: CsvDataJson | undefined = dataJson.find((x) => x.name === d.name)
            if (!entry) {
                entry = {
                    name: d.name,
                    labels,
                    lines: labels.length,
                    records: [],
                }
                dataJson.push(entry)
            }
            entry.labels = labels
            entry.lines = labels.length
            const record = {
                meta,
                data: Object.values(d.json[0] as Record<string, number>).map((y) => ({ x, y })),
            }
            entry.records.push(record)
        })

    await fs.writeFile(dataFile, JSON.stringify(csvJson, null, 2))
    await fs.writeFile(`${reportBaseDir}/index.html`, chartReport)
}
