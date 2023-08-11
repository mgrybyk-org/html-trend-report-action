import * as core from '@actions/core'
import * as github from '@actions/github'
import * as io from '@actions/io'
import * as fs from 'fs/promises'
import * as path from 'path'
import csvtojson from 'csvtojson'

const baseDir = 'html-trend-report-action'
const getBranchName = (gitRef: string) => gitRef.replace('refs/heads/', '')

const isFileExist = async (filePath: string) => {
    try {
        await fs.access(filePath, fs.constants.F_OK)
        return true
    } catch {
        return false
    }
}

const writeFolderListing = async (ghPagesPath: string, relPath: string) => {
    const isRoot = relPath === '.'
    const fullPath = isRoot ? ghPagesPath : `${ghPagesPath}/${relPath}`

    await io.cp('reports/html/index.html', fullPath)

    const links: string[] = []
    if (!isRoot) {
        links.push('..')
    }
    const listdir = (await fs.readdir(fullPath, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name)
    links.push(...listdir)

    const data: Record<string, string | string[]> = {
        links,
    }
    if (!isRoot) {
        data.date = new Date().toISOString()
    }

    await fs.writeFile(`${fullPath}/data.json`, JSON.stringify(data, null, 2))
}

const csvReport = async (sourceReportDir: string, reportBaseDir: string, meta: Record<string, string | number>) => {
    const dataFile = `${reportBaseDir}/data.json`
    let dataJson: Array<CsvDataJson>
    if (await isFileExist(dataFile)) {
        dataJson = JSON.parse((await fs.readFile(dataFile)).toString('utf-8'))
    } else {
        dataJson = []
    }

    const filesContent: Array<{ name: string; json: Array<Record<string, string>> }> = []
    if (sourceReportDir.toLowerCase().endsWith('.csv')) {
        const json = await csvtojson().fromFile(sourceReportDir)
        filesContent.push({ name: path.basename(sourceReportDir, path.extname(sourceReportDir)), json })
    } else {
        // TODO glob
    }

    const x = Date.now()
    filesContent
        // skip empty files
        .filter((d) => {
            console.log('csv: empty file', d.name)
            return d.json.length > 0
        })
        // convert values to numbers
        .map((d) => {
            Object.values(d.json[0]).map((v) => parseFloat(v))
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
                data: Object.values(d.json[0] as unknown as Record<string, number>).map((y) => ({ x, y })),
            }
            entry.records.push(record)
        })

    await fs.writeFile(dataFile, JSON.stringify(dataJson, null, 2))
}

try {
    // vars
    const sourceReportDir = core.getInput('report_dir')
    const ghPagesPath = core.getInput('gh_pages')
    const reportId = core.getInput('report_id')
    const reportType = core.getInput('report_type')
    // const isAllure = core.getInput('isAllure') === 'true'
    const branchName = getBranchName(github.context.ref)
    const reportBaseDir = `${ghPagesPath}/${baseDir}/${branchName}/${reportId}`
    const reportDir = `${reportBaseDir}/${github.context.runId}` // github.context.runNumber

    // log
    console.table({ ghPagesPath, sourceReportDir, reportId, branchName, reportBaseDir, reportDir, gitref: github.context.ref })
    // context
    const toLog = { ...github.context } as Record<string, unknown>
    delete toLog.payload
    console.log('toLog', toLog)

    // TODO index.html built-in
    // folder listing
    // do noot overwrite index.html in the folder root to avoid conflicts
    if (await isFileExist(`${ghPagesPath}/index.html`)) {
        // todo add ! above
        await writeFolderListing(ghPagesPath, '.')
    }
    await writeFolderListing(ghPagesPath, baseDir)

    // action
    await io.mkdirP(reportBaseDir)
    if (reportType === 'html') {
        await io.cp(sourceReportDir, reportDir, { recursive: true })

        // folder listing
        await writeFolderListing(ghPagesPath, `${baseDir}/${branchName}`)
    } else if (reportType === 'csv') {
        await csvReport(sourceReportDir, reportBaseDir, {
            sha: github.context.sha,
            runId: github.context.runId,
        }) // TODO index.html built-in
        await io.cp('reports/chart/index.html', reportBaseDir, { recursive: true })
    } else {
        throw new Error('Unsupported report type: ' + reportType)
    }
} catch (error) {
    core.setFailed(error.message)
}
