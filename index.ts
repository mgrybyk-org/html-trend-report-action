import * as core from '@actions/core'
import * as github from '@actions/github'
import * as io from '@actions/io'
import { csvReport } from './src/csvReport.js'
import { isFileExist } from './src/isFileExists.js'
import { writeFolderListing } from './src/writeFolderListing.js'

const baseDir = 'html-trend-report-action'
const getBranchName = (gitRef: string) => gitRef.replace('refs/heads/', '')

try {
    // vars
    const sourceReportDir = core.getInput('report_dir')
    const ghPagesPath = core.getInput('gh_pages')
    const reportId = core.getInput('report_id')
    const reportType = core.getInput('report_type')
    // const isAllure = core.getInput('isAllure') === 'true'
    const branchName = getBranchName(github.context.ref)
    const reportBaseDir = `${ghPagesPath}/${baseDir}/${branchName}/${reportId}`
    const reportDir = `${reportBaseDir}/${github.context.runId}`

    // log
    console.table({ ghPagesPath, sourceReportDir, reportId, branchName, reportBaseDir, reportDir, gitref: github.context.ref })
    // context
    const toLog = { ...github.context } as Record<string, unknown>
    delete toLog.payload
    console.log('toLog', toLog)

    // folder listing
    // do noot overwrite index.html in the folder root to avoid conflicts
    if (!(await isFileExist(`${ghPagesPath}/index.html`))) {
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
        })
    } else {
        throw new Error('Unsupported report type: ' + reportType)
    }
} catch (error) {
    core.setFailed(error.message)
}
