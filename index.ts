import * as core from '@actions/core'
import * as github from '@actions/github'
import io from '@actions/io'

const baseDir = 'html-trend-report-action'
const getBranchName = (gitRef: string) => gitRef.replace('refs/heads/', '')

try {
    // vars
    const reportId = core.getInput('report_id')
    const branchName = getBranchName(github.context.ref)
    const reportBaseDir = `${baseDir}/${branchName}/${reportId}`
    const reportDir = `${reportBaseDir}/${github.context.runNumber}`

    // log
    console.table({ reportId, branchName, reportBaseDir, reportDir })
    // context
    const toLog = { ...github.context } as Record<string, unknown>
    delete toLog.payload
    console.log('toLog', toLog)

    // action
    await io.mkdirP(`${baseDir}/${branchName}/${reportId}/${github.context.runNumber}`)

    // leftovers
    const time = new Date().toTimeString()
    core.setOutput('time', time)
} catch (error) {
    core.setFailed(error.message)
}
