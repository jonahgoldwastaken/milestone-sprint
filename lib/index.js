"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = __importDefault(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core_1.default.getInput('token');
            const projectName = core_1.default.getInput('project_name');
            const backlogColumnName = core_1.default.getInput('backlog_column');
            const todoColumnName = core_1.default.getInput('todo_column');
            switch (false) {
                case !!token:
                case !!projectName:
                case !!backlogColumnName:
                case !!todoColumnName:
                    throw new Error('Please supply a "token", "project_name", "backlog_column" and "todo_name" as arguments');
            }
            const octokit = github_1.default.getOctokit(token);
            const baseRequest = Object.assign({}, github_1.default.context.repo);
            console.log(`Fetching required data for repo ${baseRequest.repo}`);
            const { repository } = yield octokit.graphql(`
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
		}`, Object.assign(Object.assign({}, baseRequest), { project: projectName }));
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
            yield Promise.all(cards.map((card, i) => wait(i * 200).then(() => octokit.graphql(`mutation updateCard($card: MoveProjectCardInput!) {
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
            core_1.default.setFailed(error.message);
        }
    });
}
function wait(timeout = 500) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
