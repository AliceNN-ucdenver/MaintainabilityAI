const { data: issues } = await github.rest.issues.listForRepo({
  owner: context.repo.owner,
  repo: context.repo.repo,
  labels: 'ci-failure',
  state: 'open',
  per_page: 1
});
if (issues.length > 0) {
  const runUrl = context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo + '/actions/runs/' + context.runId;
  const commitUrl = context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo + '/commit/' + context.sha;
  const bt = String.fromCharCode(96);
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issues[0].number,
    body: 'All tests passing as of [' + bt + context.sha.substring(0, 7) + bt + '](' + commitUrl + '). Closing.\n\n[View run](' + runUrl + ')'
  });
  await github.rest.issues.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issues[0].number,
    state: 'closed'
  });
  core.info('Closed issue #' + issues[0].number);
}
