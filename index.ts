import * as core from '@actions/core'
import * as github from '@actions/github'
import * as io from '@actions/io'
import * as fs from 'fs/promises'

const baseDir = 'html-trend-report-action'
const getBranchName = (gitRef: string) => gitRef.replace('refs/heads/', '')

const writeFolderListing = async (ghPagesPath: string, relPath: string) => {
    const isRoot = relPath === '.'
    const fullPath = isRoot ? ghPagesPath : `${ghPagesPath}/${relPath}`

    await io.cp('test/index.html', fullPath)

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

try {
    // vars
    const sourceReportDir = core.getInput('report_dir')
    const ghPagesPath = core.getInput('gh_pages')
    const reportId = core.getInput('report_id')
    const isAllure = core.getInput('isAllure') === 'true'
    const branchName = getBranchName(github.context.ref)
    const reportBaseDir = `${ghPagesPath}/${baseDir}/${branchName}/${reportId}`
    const reportDir = `${reportBaseDir}/${github.context.runId}` // github.context.runNumber

    // log
    console.table({ ghPagesPath, sourceReportDir, reportId, branchName, reportBaseDir, reportDir, isAllure, gitref: github.context.ref })
    // context
    const toLog = { ...github.context } as Record<string, unknown>
    delete toLog.payload
    console.log('toLog', toLog)

    // action
    await io.mkdirP(reportBaseDir)
    await io.cp(sourceReportDir, reportDir, { recursive: true })

    // temp
    await writeFolderListing(ghPagesPath, '.')
    await writeFolderListing(ghPagesPath, baseDir)
    await writeFolderListing(ghPagesPath, `${baseDir}/${branchName}`)
    await writeFolderListing(ghPagesPath, `${baseDir}/${branchName}/${reportId}`)
} catch (error) {
    core.setFailed(error.message)
}
