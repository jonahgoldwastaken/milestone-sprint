# Milestone Sprint

Prepare a sprint for the milestone which is closest due

## Inputs

### `project_name`

**Required** The name of the project to update the tasks on.

### `token`

**Required** The token provided by GitHub under secrets.GITHUB_TOKEN.

### `backlog_column`

The column to move the tasks in the nearest milestone from. Default `"Backlog"`.

### `todo_column`

The column to move the tasks in the nearest milestone to. Default `"To do"`.

## Outputs

Nothing at the moment.

## Example usage

uses: actions/hello-world-javascript-action@v1.1
with:
who-to-greet: 'Mona the Octocat'
