import path from 'path'
import fs from 'fs/promises'
import { lighthouseSetup } from 'lighthouse-reporting'

const lhScoresDir = path.join(process.cwd(), process.env.LH_SCORES_DIR || 'lh-scores')
const csvReportDir = path.join(process.cwd(), process.env.LH_CSV_REPORT_DIR || 'lighthouse')

async function globalSetup() {
    await fs.mkdir(lhScoresDir, { recursive: true })
    await fs.mkdir(csvReportDir, { recursive: true })
    await lighthouseSetup()
}

export default globalSetup
