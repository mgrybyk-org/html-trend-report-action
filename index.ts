import * as path from 'path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as io from '@actions/io'
import { csvReport } from './src/csvReport.js'
import { isFileExist } from './src/isFileExists.js'
import { shouldWriteRootHtml, writeFolderListing } from './src/writeFolderListing.js'
import { getBranchName } from './src/helpers.js'
import { cleanupOutdatedBranches, cleanupOutdatedReports } from './src/cleanup.js'

const baseDir = 'report-action'

try {
    const runTimestamp = Date.now()

    // vars
    const sourceReportDir = core.getInput('report_dir')
    const ghPagesPath = core.getInput('gh_pages')
    const reportId = core.getInput('report_id')
    const reportType = core.getInput('report_type')
    const listDirs = core.getInput('list_dirs') == 'true'
    const listDirsBranch = core.getInput('list_dirs_branch') == 'true'
    const branchCleanupEnabled = core.getInput('branch_cleanup_enabled') == 'true'
    const maxReports = parseInt(core.getInput('max_reports'), 10)
    const branchName = getBranchName(github.context.ref, github.context.payload.pull_request)
    const ghPagesBaseDir = path.join(ghPagesPath, baseDir)
    const reportBaseDir = path.join(ghPagesBaseDir, branchName, reportId)

    /**
     * `runId` is unique but won't change on job re-run
     * `runNumber` is not unique and resets from time to time
     * that's why the `runTimestamp` is used to guarantee uniqueness
     */
    const runUniqueId = `${github.context.runId}_${runTimestamp}`
    const reportDir = path.join(reportBaseDir, runUniqueId)

    // urls
    const ghPagesUrl = `https://${github.context.repo.owner}.github.io/${github.context.repo.repo}`
    const ghPagesBaseUrl = `${ghPagesUrl}/${baseDir}/${branchName}/${reportId}`.replaceAll(' ', '%20')
    const ghPagesReportUrl = `${ghPagesBaseUrl}/${runUniqueId}`.replaceAll(' ', '%20')

    const reportUrl = reportType === 'csv' ? ghPagesBaseUrl : ghPagesReportUrl

    // log
    console.log({
        report_dir: sourceReportDir,
        gh_pages: ghPagesPath,
        report_id: reportId,
        runUniqueId,
        ref: github.context.ref,
        repo: github.context.repo,
        branchName,
        reportBaseDir,
        reportDir,
        report_url: reportUrl,
        listDirs,
        listDirsBranch,
        branchCleanupEnabled,
        maxReports,
    })

    if (!(await isFileExist(ghPagesPath))) {
        throw new Error("Folder with gh-pages branch doesn't exist: " + ghPagesPath)
    }

    if (!['html', 'csv'].includes(reportType)) {
        throw new Error('Unsupported report type: ' + reportType)
    }

    // action
    await io.mkdirP(reportBaseDir)

    // process report
    if (reportType === 'html') {
        await io.cp(sourceReportDir, reportDir, { recursive: true })
    } else if (reportType === 'csv') {
        await csvReport(sourceReportDir, reportBaseDir, reportId, {
            sha: github.context.sha,
        })
    }

    // folder listing
    if (listDirs) {
        if (await shouldWriteRootHtml(ghPagesPath)) {
            await writeFolderListing(ghPagesPath, '.')
        }
        await writeFolderListing(ghPagesPath, baseDir)
    }
    if (listDirsBranch) {
        await writeFolderListing(ghPagesPath, path.join(baseDir, branchName))
        await writeFolderListing(ghPagesPath, path.join(baseDir, branchName))
        if (reportType === 'html') {
            await writeFolderListing(ghPagesPath, path.join(baseDir, branchName, reportId))
        }
    }

    // outputs
    core.setOutput('report_url', reportUrl)
    core.setOutput('report_history_url', ghPagesBaseUrl)
    core.setOutput('run_unique_id', runUniqueId)
    core.setOutput('report_path', reportDir)

    if (branchCleanupEnabled) {
        await cleanupOutdatedBranches(ghPagesBaseDir)
    }
    if (maxReports > 0) {
        await cleanupOutdatedReports(ghPagesBaseDir, maxReports)
    }
} catch (error) {
    core.setFailed(error.message)
}
