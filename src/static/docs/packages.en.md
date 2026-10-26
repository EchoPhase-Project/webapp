# Packages

A package holds workflows that belong together, the way a repository holds code. Every workflow lives in exactly one package.

## What a package gives its workflows

- **Calls.** A workflow can run another workflow of the same package (the ExecuteWorkflow block). It names it by its _key_, which stays the same when the workflow is renamed and in every installed copy. Workflows of other packages cannot be called.
- **Storage.** The Storage block keeps values between runs: a workflow's own (scope _Workflow_) or shared by all the workflows of the package (scope _Package_). Other packages do not see them.
- **Errors.** One workflow of the package can handle failed runs: when an automatic run (webhook, schedule, event) of any of them fails, its ErrorTrigger starts with what failed and why. Choose it in the package's settings.

## Starting a package

- **New package** on the Packages page makes an empty one; import workflows into it from export files.
- Importing a workflow without choosing a package makes a package of its own, with the same name.
- Installing a package from [Explore](/docs/explore) makes a package of yours with its workflows.

## Publishing

A package is yours until you publish a _version_ of it: a fixed copy of its workflows that others read and install. Publishing again makes the next version; the old ones stay.

You choose which workflows go into a version (all of them to start with). What a chosen workflow calls, and the package's error workflow, must be chosen too: otherwise the installer would get a call to nothing, and publishing is refused.

Webhook secrets are left out of a version. Anything else in the blocks (an API key in a header) is published as it is.

## Who sees it

- **Private**: you and the people you share it with (by username).
- **Unlisted**: anyone signed in who has its link.
- **Public**: everyone, listed in Explore.

Change it in the package's settings, under _Visibility_. Only published versions are seen by others; your workflows as they are now stay yours.

## Deleting

Deleting a package deletes its workflows, with their versions, schedules and storage, and its published versions. Packages others installed from it stay theirs.
