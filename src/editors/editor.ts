import { CodeEditor } from "@jupyterlab/codeeditor";

export type KeyModifier = 'Alt' | 'Control' | 'Shift' | 'Meta' | 'AltGraph';

export interface IEditorExtension {

  editor: CodeEditor.IEditor;

  selectToken(lookupName: string, target: Node): CodeEditor.IToken;

  connect(modifierKey: KeyModifier): void;

  getTokens(): Array<CodeEditor.IToken>;
}
