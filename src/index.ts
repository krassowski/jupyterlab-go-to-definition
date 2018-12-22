import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { INotebookTracker } from "@jupyterlab/notebook";
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { ISettingRegistry } from '@jupyterlab/coreutils'

import { FileEditorJumper } from "./jumpers/fileeditor";
import { NotebookJumper } from "./jumpers/notebook";

import { CodeMirrorExtension } from "./editors/codemirror";
import { KeyModifier } from "./editors/editor";


/**
 * The plugin registration information.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyterlab_go_to_definition:plugin',
  requires: [IEditorTracker, INotebookTracker, ISettingRegistry],
  activate: (
    app: JupyterLab,
    fileEditorTracker: IEditorTracker,
    notebookTracker: INotebookTracker,
    settingRegistry: ISettingRegistry
  ) => {

    CodeMirrorExtension.configure();

    fileEditorTracker.widgetAdded.connect((sender, widget) => {

      let fileEditor = widget.content;

      if (fileEditor.editor instanceof CodeMirrorEditor) {

        let jumper = new FileEditorJumper(fileEditor);
        let extension = new CodeMirrorExtension(fileEditor.editor, jumper);

        extension.connect();
      }
    });

    notebookTracker.widgetAdded.connect((sender, widget) => {

      let notebook = widget.content;
      // btw: notebookTracker.currentWidget.content === notebook

      let jumper = new NotebookJumper(notebook);

      // timeout ain't elegant but the widgets are not populated at the start-up time
      // (notebook.widgets.length === 1) - some time is needed for that,
      // and I can't see any callbacks for cells.

      // more insane idea would be to have it run once every 2 seconds
      // more reasonable thing would be to create a PR with .onAddCell
      setTimeout(() => {
        // now (notebook.widgets.length is likely > 1)
        notebook.widgets.every((cell) => {

          let codemirror_editor = cell.editor as CodeMirrorEditor;
          let extension = new CodeMirrorExtension(codemirror_editor, jumper);

          extension.connect();

          return true
        });
      }, 2000);

      // for that cells which will be added later:
      notebook.activeCellChanged.connect((notebook, cell) => {
        if(cell === undefined)
          return;

        let codemirror_editor = cell.editor as CodeMirrorEditor;
        let extension = new CodeMirrorExtension(codemirror_editor, jumper);

        extension.connect();
      });

    });

    function updateOptions(settings: ISettingRegistry.ISettings): void {
      let options = settings.composite;
      Object.keys(options).forEach((key) => {
        if (key === 'modifier') {
          let modifier = options[key] as KeyModifier;
          CodeMirrorExtension.modifierKey = modifier;
        }
      });
    }

    settingRegistry
      .load(plugin.id)
      .then(settings => {
        updateOptions(settings);
        settings.changed.connect(() => {
          updateOptions(settings);
        });
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });

  },
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;
