# Milestone Sprint

Prepare your GitHub project for a sprint by automatically moving cards with the closest-due milstone attached from the backlog to your to do column.

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

```yaml
jobs:
  start-sprint:
    runs-on: ubuntu-latest
    steps:
      - uses: theonejonahgold/milestone-sprint@v1.0.3
        with:
          project_name: Project # Set this to the project name on your repo
          token: ${{ secrets.GITHUB_TOKEN }}
```
