const core = require('@actions/core')
const github = require('@actions/github')

main()

async function main() {
	try {
		const token = core.getInput('token')
		const projectName = core.getInput('project_name')
		const backlogColumnName = core.getInput('backlog_column')
		const todoColumnName = core.getInput('todo_column')

		switch (false) {
			case token:
			case projectName:
			case backlogColumnName:
			case todoColumnName:
				throw new Error(
					'Please supply a "token", "project_name", "backlog_column" and "todo_name" as arguments'
				)
		}

		const octokit = github.getOctokit(token)

		const baseRequest = {
			owner: github.context.repo.owner,
			repo: github.context.repo.owner,
		}

		const { data: projectsForRepo } = await octokit.rest.projects.listForRepo({
			...baseRequest,
			headers: {
				accept: 'application/vnd.github.inertia-preview+json',
			},
			state: 'open',
		})

		const project = projectsForRepo.find(
			project => project.name === projectName
		)

		const { data: columns } = await octokit.rest.projects.listColumns({
			headers: {
				accept: 'application/vnd.github.inertia-preview+json',
			},
			project_id: project.id,
		})

		const fromColumn = columns.find(col => col.name === backlogColumnName)
		const toColumn = columns.find(col => col.name === todoColumnName)

		const { data: cards } = await octokit.rest.projects.listCards({
			headers: {
				accept: 'application/vnd.github.inertia-preview+json',
			},
			column_id: fromColumn.id,
			archived_state: 'not_archived',
		})

		const filteredCards = cards.filter(card => !!card.content_url)

		const issueNumbers = filteredCards.map(
			({ content_url }) =>
				+content_url.slice(
					0,
					`https://api.github.com/repos/${github.context.repo.owner}/${github.context.repo.repo}/issues/`
						.length
				)
		)

		const issueNumberToCardMap = new Map(
			filteredCards.reduce(
				(acc, curr, i) => [...acc, [issueNumbers[i], curr]],
				[]
			)
		)

		const {
			data: [{ title, number: milestoneNumber }],
		} = await octokit.rest.issues.listMilestones({
			...baseRequest,
			sort: 'due_on',
		})

		const { data: issuesForMilestone } = await octokit.rest.issues.listForRepo({
			...baseRequest,
			milestone: milestoneNumber,
		})

		const filteredIssues = issuesForMilestone.filter(issue =>
			issueNumberToCardMap.has(issue.number)
		)

		await Promise.all(
			filteredIssues.map(issue =>
				octokit.rest.projects.moveCard({
					headers: {
						accept: 'application/vnd.github.inertia-preview+json',
					},
					position: 'position',
					card_id: issueNumberToCardMap.get(issue.number),
					column_id: toColumn.id,
				})
			)
		)
	} catch (error) {
		core.setFailed(error.message)
	}
}
