import path from 'path'
import { lighthousePlaywrightTeardown, buildAverageCsv } from 'lighthouse-reporting'

const lhScoresDir = path.join(process.cwd(), process.env.LH_SCORES_DIR || 'lh-scores')
const csvReportDir = path.join(process.cwd(), process.env.LH_CSV_REPORT_DIR || 'lighthouse')

async function globalTeardown() {
    await lighthousePlaywrightTeardown()
    await buildAverageCsv(lhScoresDir, csvReportDir)
}

export default globalTeardown
