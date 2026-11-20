// Every string the admin UI shows, under the `workflows` namespace (`t("workflows:start")`).
// Server messages (refusal reasons, guard titles) come from the server and the definitions as-is.

export const en = {
  // Panel
  panelLabel: "Workflow",
  loading: "Loading workflow…",
  loadFailed: "The workflow could not be loaded.",
  retry: "Try again",
  start: "Start {{title}}",
  startDescription: "Not running on this document.",
  stageProgress: "Stage {{current}} of {{total}}: {{stage}}",
  stagePast: "done",
  stageCurrent: "current",
  stageUpcoming: "next",
  statusActive: "To do",
  statusDone: "Done",
  statusSkipped: "Skipped",
  statusFailed: "Failed",
  statusCompleted: "Completed",
  statusAborted: "Aborted",
  statusStuck: "Stuck",
  waitingOn: "Waiting on {{who}}",
  waitingOnAnyone: "Anyone can act",
  you: "you",
  roleLabel: "{{role}} (role)",
  guardHolds: "Held in this stage: {{operations}}",
  operationPublish: "publishing",
  operationUpdate: "saving",
  operationDelete: "deleting",
  stuck:
    "This run is stuck: its stage “{{stage}}” is no longer in the workflow definition. It can only be aborted.",
  abort: "Abort",
  abortHeading: "Abort {{title}}?",
  abortBody:
    "The run stops in “{{stage}}” and its guards stop holding this document. Its history is kept. This cannot be undone.",
  abortConfirm: "Abort run",
  aborting: "Aborting…",
  cancel: "Cancel",
  finishedCompleted: "{{title}} completed {{when}}",
  finishedAborted: "{{title}} was aborted {{when}}",
  showHistory_one: "Show history ({{count}} entry)",
  showHistory_other: "Show history ({{count}} entries)",
  hideHistory: "Hide history",
  somethingWentWrong: "Something went wrong.",

  // Param form
  paramsSubmit: "Confirm",
  paramsRequired: "{{label}} is required.",
  paramsNumber: "{{label}} must be a number.",
  paramsDate: "{{label}} must be a date.",
  paramsChoose: "Choose…",
  paramsYes: "Yes",

  // History sentences
  actorSystem: "The workflow",
  actorYou: "You",
  actorAgent: "{{name}} (via an agent)",
  actorApi: "{{name}} (via the API)",
  historyStarted: "{{actor}} started the run in {{stage}}.",
  historyAction: "{{actor}} chose “{{action}}” on {{activity}}.",
  historyActionAuto: "“{{action}}” ran on {{activity}}.",
  historyTransition: "Moved from {{from}} to {{to}}.",
  historyEffectQueued: "Queued {{effect}}.",
  historyEffectDone: "{{effect}} finished.",
  historyEffectFailed: "{{effect}} failed: {{error}}",
  historyCompleted: "The run completed.",
  historyAborted: "{{actor}} aborted the run.",
  historyAbortedReason: "{{actor}} aborted the run: {{reason}}",

  // View
  viewTitle: "Workflows",
  viewDescription: "Documents moving through a workflow, and what each one is waiting on.",
  tabMine: "For me",
  tabAll: "All open",
  filterLabel: "Workflow",
  filterAll: "All workflows",
  columnDocument: "Document",
  columnWorkflow: "Workflow",
  columnStage: "Stage",
  columnWaitingOn: "Waiting on",
  columnUpdated: "Last changed",
  untitled: "Untitled ({{id}})",
  anyone: "Anyone",
  emptyMineTitle: "Nothing is waiting on you.",
  emptyMineBody: "Runs assigned to you or to one of your roles show up here.",
  emptyMineAction: "See all open runs",
  emptyAllTitle: "No workflow is running.",
  emptyAllBody:
    "Start one from the Workflow panel in the sidebar of a document. Open runs show up here.",
  boardEmptyColumn: "No runs",
  boardStuck: "Stuck",
  runs_one: "{{count}} run",
  runs_other: "{{count}} runs",
};

export type WorkflowsTranslations = typeof en;

/** Per-locale overrides, merged over the English defaults. */
export type WorkflowsTranslationsOption = Record<string, Partial<WorkflowsTranslations>>;
