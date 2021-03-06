"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github = require("@actions/github");
run();
async function run() {
    try {
        const token = core.getInput('token');
        const projectName = core.getInput('project_name');
        const backlogColumnName = core.getInput('backlog_column');
        const todoColumnName = core.getInput('todo_column');
        switch (false) {
            case !!token:
            case !!projectName:
            case !!backlogColumnName:
            case !!todoColumnName:
                throw new Error('Please supply a "token", "project_name", "backlog_column" and "todo_name" as arguments');
        }
        const octokit = github.getOctokit(token);
        const baseRequest = {
            ...github.context.repo,
        };
        console.log(`Fetching required data for repo ${baseRequest.repo}`);
        const { repository } = await octokit.graphql(`
		query FindProject($owner: String!, $repo: String!, $project: String) {
			repository(owner: $owner, name: $repo) {
				milestones(states: [OPEN], orderBy: {field: DUE_DATE, direction: ASC}, first: 1) {
					nodes {
						id
						title
					}
				}
				projects(search: $project, first: 1) {
					nodes {
						id
						name
						columns(first: 5) {
							nodes {
								id
								name
								cards(archivedStates: NOT_ARCHIVED, first: 100) {
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
		}`, {
            ...baseRequest,
            project: projectName,
        });
        const project = repository.projects.nodes[0];
        if (!project)
            throw new Error(`Project with name "${projectName}" not found`);
        console.log(`Finding column "${todoColumnName}" and "${backlogColumnName}" in project "${projectName}"`);
        const columns = project.columns.nodes;
        const fromColumn = columns.find(col => col.name.toLowerCase() === backlogColumnName.toLowerCase());
        const toColumn = columns.find(col => col.name.toLowerCase() === todoColumnName.toLowerCase());
        if (!fromColumn)
            throw new Error(`Backlog column with name "${backlogColumnName}" not found ${projectName}`);
        if (!toColumn)
            throw new Error(`Backlog column with name "${todoColumnName}" not found in project ${projectName}`);
        const milestone = repository.milestones.nodes[0];
        console.log(`Retrieving cards in "${backlogColumnName}" with milestone "${milestone.title}"`);
        const cards = columns
            .find(col => col.name.toLowerCase() === backlogColumnName.toLowerCase())
            .cards.nodes.filter(card => !!card.content.milestone)
            .filter(card => card.content.milestone.id === milestone.id);
        if (!cards.length) {
            return console.log('No cards to move, happy sprinting! :)');
        }
        console.log(`Moving ${cards.length} ${cards.length === 1 ? 'card' : 'cards'} from "${backlogColumnName}" to "${todoColumnName}"`);
        await Promise.all(cards.map((card, i) => wait(i * 200).then(() => octokit.graphql(`mutation updateCard($card: MoveProjectCardInput!) {
							moveProjectCard(input: $card) {
								cardEdge {
									node {
										id
									}
								}
							}
						}`, {
            card: {
                columnId: toColumn.id,
                cardId: card.id,
            },
            headers: {
                accept: 'application/vnd.github.inertia-preview+json',
            },
        }))));
        console.log('Successfully moved cards, happy sprinting! :)');
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
function wait(timeout = 500) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
