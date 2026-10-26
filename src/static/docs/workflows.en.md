# Workflows

A workflow is a program of blocks, kept in a [package](/docs/packages). Its triggers start runs; each block does one thing (an HTTP request, a Discord call, a note, a value kept in storage) and hands its output to the next.

## Turning it on

A workflow's triggers start runs only while **Run on triggers** is on. Running it by hand (**Run now**, with a JSON input) works either way.

## Triggers

- **ManualTrigger**: by hand, or when another workflow of the package calls it.
- **WebhookTrigger**: a POST to its address with the header `X-Webhook-Secret` set to its secret; the JSON body is the run's input. The workflow page shows the address and, when asked, the secret; **New secret** replaces it (the old one stops working at once). What the caller gets back:
    - _Immediately_: 202 at once, with the run's id;
    - _OnFinish_: it waits for the run and gets its last block's output (500 if it fails);
    - _ByBlock_: it waits for a RespondToWebhook block and gets what it sends.
- **ScheduleTrigger**: a cron schedule (five fields) in the workflow's time zone, or yours.
- **Discord events**: an event of a Discord connection of yours.
- **ErrorTrigger**: in the package's error workflow, when an automatic run of the package fails.

## Runs

Every run is kept for a while: its status, what started it, how long it took and, while the server keeps it, its result (output, variables, errors). A workflow's runs are on its page; those of all a package's workflows on the package's _Runs_.

## Versions

Every change of the program is a new version (the last 50 are kept). An old version can be restored: it becomes the current one as a new version on top, nothing is lost. A workflow, or one of its versions, exports to a file that imports on any EchoPhase server.
