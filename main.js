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

		const { repository } = await octokit.graphql(
			`
	query FindProject($owner: String!, $repo: String!, $project: String) {
		repository(owner: $owner, name: $repo) {
			milestones(states: [OPEN], orderBy: {field: DUE_DATE, direction: ASC}, first: 100) {
				nodes {
					issues(filterBy: {states: [OPEN]}, first: 100) {
						nodes {
							id
						}
					}
				}
			}
			projects(search: $project, first: 100) {
				nodes {
					id
					name
					columns(first: 100) {
						nodes {
							id
							name
							cards {
								nodes {
									id
									content {
										... on Issue {
											milestone {
												id
											}
										}
										... on PullRequest {
											milestone {
												id
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}`,
			{
				...baseRequest,
				project: projectName,
			}
		)

		console.dir(repository)

		const project = repository.projects.nodes[0]

		if (!project) throw new Error(`Project with name ${projectName} not found`)

		console.log('Project with correct name:', project)

		const columns = project.columns.nodes

		console.log('Columns in project:', columns)

		const fromColumn = columns.find(
			col => col.name.toLowerCase() === backlogColumnName
		)
		const toColumn = columns.find(
			col => col.name.toLowerCase() === todoColumnName
		)

		if (!fromColumn)
			throw new Error(`Backlog column with ${backlogColumnName} not found`)

		if (!toColumn)
			throw new Error(`Backlog column with ${todoColumnName} not found`)

		const milestone = repository.milestones[0]

		const cards = columns
			.filter(col => col.name.toLowerCase() === backlogColumnName.toLowerCase())
			.cards.nodes.filter(card => card.milestone.id === milestone.id)

		console.log('Cards found in backlog column:', cards)

		const responses = await Promise.all(
			cards.map(card =>
				octokit.graphql(
					`
	mutation updateCardPosition($card: MoveProjectCardInput!) {
		moveProjectCard(input: $card) {
			cardEdge {
				node {
					id
				}
			}
		}
	}
					`,
					{
						card: {
							columnId: toColumn.id,
							cardId: card.id,
						},
						headers: {
							accept: 'application/vnd.github.inertia-preview+json',
						},
					}
				)
			)
		)

		console.log(responses)
	} catch (error) {
		core.setFailed(error.message)
	}
}
