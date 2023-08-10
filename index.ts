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

    await io.cp('test/html/index.html', fullPath)

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

const csvReport = async (sourceReportDir: string, reportBaseDir: string) => {
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
        .filter((d) => d.json.length > 0)
        .forEach((d) => {
            const labels = Object.keys(d.json[0])
            let entry: CsvDataJson | undefined = dataJson.find((x) => x.name === d.name)
            if (!entry) {
                entry = {
                    name: d.name,
                    labels,
                    lines: labels.length,
                    records: {
                        meta: [], // TODO
                        data: [],
                    },
                }
            }
            entry.labels = labels
            entry.lines = labels.length
            entry.records.data.push(
                Object.values(d.json[0])
                    .map((s) => parseFloat(s))
                    .map((y) => ({ x, y }))
            )
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

    // action
    await io.mkdirP(reportBaseDir)
    if (reportType === 'html') {
        await io.cp(sourceReportDir, reportDir, { recursive: true })
    } else if (reportType === 'csv') {
        await csvReport(sourceReportDir, reportDir) // TODO index.html built-in
        await io.cp('test/chart/index.html', reportBaseDir, { recursive: true })
    } else {
        throw new Error('Unsupported report type: ' + reportType)
    }

    // TODO index.html built-in
    // folder listing
    // do noot overwrite index.html in the folder root to avoid conflicts
    if (await isFileExist(`${ghPagesPath}/index.html`)) {
        // todo add ! above
        await writeFolderListing(ghPagesPath, '.')
    }
    await writeFolderListing(ghPagesPath, baseDir)
    await writeFolderListing(ghPagesPath, `${baseDir}/${branchName}`)
    await writeFolderListing(ghPagesPath, `${baseDir}/${branchName}/${reportId}`)
} catch (error) {
    core.setFailed(error.message)
}
