import path from 'path'
import { playAudit } from 'playwright-lighthouse'
import {
    playwrightLighthouseTest,
    getScores,
    writeCsvResult,
    writeHtmlListEntryWithRetry,
    LighthouseResult,
    writeScoresToJson,
} from 'lighthouse-reporting'

playwrightLighthouseTest.setTimeout(60000)
const lhScoresDir = path.join(process.cwd(), process.env.LH_SCORES_DIR || 'lh-scores')
const csvReportDir = path.join(process.cwd(), process.env.LH_CSV_REPORT_DIR || 'lighthouse')
const htmlReportDir = path.join(process.cwd(), process.env.LH_REPORT_DIR || 'lighthouse')
const htmlFilePath = path.join(htmlReportDir, 'index.html')

const lighthousePages = [
    { name: 'Chart', url: '/chart/' },
    { name: 'Folder Listing', url: '/html/' },
]

lighthousePages.forEach(({ name, url }) => {
    playwrightLighthouseTest(name, async ({ context, port, baseURL }) => {
        const onlyCategories = ['accessibility']
        const thresholds = { accessibility: 100 }

        context // let playwright initialize context

        const result: LighthouseResult = await playAudit({
            url: baseURL + url,
            port,
            thresholds,
            reports: {
                formats: {
                    html: true,
                },
                name,
                directory: htmlReportDir,
            },
            opts: {
                onlyCategories,
                screenEmulation: { disabled: true },
            },
            disableLogs: true,
            ignoreError: true,
        })

        const scores = getScores(result)
        await writeCsvResult(csvReportDir, name, scores, thresholds)
        await writeHtmlListEntryWithRetry(htmlFilePath, name, scores, thresholds, result.comparisonError)
        // write score results in JSON, allows generating the Average csv report
        await writeScoresToJson(lhScoresDir, name, scores, result)
    })
})
