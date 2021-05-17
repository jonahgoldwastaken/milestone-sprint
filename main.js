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

		console.log(token)
		console.log(projectName)
		console.log(backlogColumnName)
		console.log(todoColumnName)
		console.log(github.context.repo.owner)
		console.log(github.context.repo.repo)

		const octokit = github.getOctokit(token)

		const baseRequest = {
			...github.context.repo,
		}

		const { data: projectsForRepo, status } =
			await octokit.rest.projects.listForRepo({
				...baseRequest,
				headers: {
					accept: 'application/vnd.github.inertia-preview+json',
				},
				state: 'open',
			})

		console.log('status for project fetch:', status)

		console.log(
			'Projects in repo:',
			projectsForRepo.map(({ name }) => name)
		)

		const project = projectsForRepo.find(
			project => project.name === projectName
		)

		if (!project) throw new Error(`Project with name ${projectName} not found`)

		console.log('Project with correct name:', project)

		const { data: columns } = await octokit.rest.projects.listColumns({
			headers: {
				accept: 'application/vnd.github.inertia-preview+json',
			},
			project_id: project.id,
		})

		console.log('Columns in project:', columns)

		const fromColumn = columns.find(col => col.name === backlogColumnName)
		const toColumn = columns.find(col => col.name === todoColumnName)

		if (!fromColumn)
			throw new Error(`Backlog column with ${backlogColumnName} not found`)

		if (!toColumn)
			throw new Error(`Backlog column with ${todoColumnName} not found`)

		const { data: cards } = await octokit.rest.projects.listCards({
			headers: {
				accept: 'application/vnd.github.inertia-preview+json',
			},
			column_id: fromColumn.id,
			archived_state: 'not_archived',
		})

		console.log('Cards found in backlog column:', cards)

		const filteredCards = cards.filter(card => !!card.content_url)

		const issueNumbers = filteredCards.map(
			({ content_url }) =>
				+content_url.slice(
					`https://api.github.com/repos/${github.context.repo.owner}/${github.context.repo.repo}/issues/`
						.length
				)
		)

		console.log('Issue numbers:', issueNumbers)

		const issueNumberToCardMap = new Map(
			filteredCards.reduce(
				(acc, curr, i) => [...acc, [issueNumbers[i], curr]],
				[]
			)
		)

		console.log('Issue to card map:', issueNumberToCardMap)

		const {
			data: [{ number: milestoneNumber }],
		} = await octokit.rest.issues.listMilestones({
			...baseRequest,
			sort: 'due_on',
		})

		console.log('Milestone number:', milestoneNumber)

		const { data: issuesForMilestone } = await octokit.rest.issues.listForRepo({
			...baseRequest,
			milestone: milestoneNumber,
		})

		console.log('Issues for milestone:', issuesForMilestone)

		const filteredIssues = issuesForMilestone.filter(issue =>
			issueNumberToCardMap.has(issue.number)
		)

		console.log('filtered issues for milestone:', filteredIssues)

		const responses = await Promise.all(
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

		console.log(responses)
	} catch (error) {
		core.setFailed(error.message)
	}
}
