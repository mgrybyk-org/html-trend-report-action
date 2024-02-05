# html-trend-report-action

Publish html trend reports per branch (type: `node20`)

Implementation of Jenkins [Plot](https://plugins.jenkins.io/plot/) and [HTML Publisher](https://plugins.jenkins.io/htmlpublisher/).


See examples:

- [CSV report, single file, Allure Trend](https://mgrybyk.github.io/html-trend-report-action/report-action/main/Allure%20Trend%20Report/)
- [CSV report, multiple files, Lighthouse Trend](https://mgrybyk.github.io/html-trend-report-action/report-action/main/Lighthouse%20Trend%20Report/)
- [HTML Report](https://mgrybyk.github.io/html-trend-report-action/report-action/main/Lighthouse%20Report/7784322733_1707135682151/)
- [HTML Report history](https://mgrybyk.github.io/html-trend-report-action/report-action/main/Lighthouse%20Report/)
- [Browse different branches](https://mgrybyk.github.io/html-trend-report-action/)
- [Pull Request Comment Example](https://github.com/mgrybyk/html-trend-report-action/pull/3)

*Compatible with [allure-report-branch-action](https://github.com/marketplace/actions/allure-report-with-history-per-branch). See [Allure History List](https://mgrybyk.github.io/html-trend-report-action/allure-action/main/self-test/)*

## Usage

1. Enable Pages in your repository settings.
![Github Pages](docs/github_pages.png "Github Pages")

2. In your workflow yaml
```yaml
permissions:
  contents: write

steps:
  - name: Checkout gh-pages
    uses: actions/checkout@v3
    if: always()
    continue-on-error: true
    with:
      ref: gh-pages # branch name
      path: gh-pages-dir # checkout path

  - name: HTML Report
    if: always()
    uses: mgrybyk/html-trend-report-action@v1
    id: html-report # used in comment to PR
    with:
      report_id: 'Jacoco Report'
      gh_pages: 'gh-pages-dir'
      report_dir: 'test/html' # provide path to folder containing the html report

  - name: Chart Report (single csv)
    if: ${{ always() }}
    uses: mgrybyk/html-trend-report-action@v1
    id: chart-report # used in comment to PR
    with:
      report_id: 'Trend Report'
      gh_pages: 'gh-pages-dir'
      report_dir: 'test/data.csv' # provide path to csv file
      list_dirs: ${{ github.ref == 'refs/heads/main' }}
      report_type: csv

  - name: Chart Report (multiple csv)
    if: ${{ always() }}
    uses: mgrybyk/html-trend-report-action@v1
    id: chart-report # used in comment to PR
    with:
      report_id: 'Trend Report'
      gh_pages: 'gh-pages-dir'
      report_dir: 'test/csv' # provide path to folder containing csv files
      report_type: csv

  - name: Git Commit and Push Action
    uses: mgrybyk/git-commit-pull-push-action@v1
    if: always()
    with:
      repository: gh-pages-dir
      branch: gh-pages
      pull_args: --rebase -X ours
```

### Adding PR Comment

Make sure to set `id` in `mgrybyk/html-trend-report-action` step.

```yaml
permissions:
  # required by https://github.com/thollander/actions-comment-pull-request
  pull-requests: write

steps:
  # After publishing to gh-pages
  - name: Comment PR with Allure Report link
    if: ${{ always() && github.event_name == 'pull_request' && (steps.allure.outputs.report_url || steps.html-1.outputs.report_url || steps.chart-2.outputs.report_url) }}
    continue-on-error: true
    uses: thollander/actions-comment-pull-request@v2
    with:
      message: |
        [Report](${{ steps.html-report.outputs.report_url }})
      comment_tag: test_reports
      mode: recreate
```

### Examples Repos

TODO

## API

Please see [action.yml](./action.yml)

## Troubleshooting

### Issues on push to gh-pages

Log `! [rejected]        HEAD -> gh-pages (non-fast-forward)`

Do not run your workflow concurrently per PR or branch!
```yaml
# Allow only one job per PR or branch
concurrency:
  group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}
  cancel-in-progress: true # true to cancel jobs in progress, set to false otherwise
```

## Credits

- [thollander/actions-comment-pull-request](https://github.com/thollander/actions-comment-pull-request) for building Github Action that comments the linked PRs

## ## Planned features

- cleanup `data.json` file per report. Raise an issue if you're interested!
