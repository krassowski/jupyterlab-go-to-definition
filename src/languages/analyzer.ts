import { Cell } from "@jupyterlab/cells";
import { CodeEditor } from "@jupyterlab/codeeditor";
import { IEditorExtension } from "../editors/editor";

export abstract class LanguageAnalyzer {

  tokens: Array<CodeEditor.IToken>;
  /**
   * Name of a variable for which a definition is sought
   */
  name: string;

  constructor(editor: IEditorExtension, name: string) {
    this.tokens = editor.getTokens();
    this.name = name;
  }

  abstract nameMatches(token: CodeEditor.IToken): boolean

  abstract isDefinition(token: CodeEditor.IToken, i: number): boolean

  getDefinitions() {
    return Array.from(this.tokens)
    .filter(
      (token, i) => this.isDefinition(token, i)
    );
  }

  /**
   * Check whether testedToken belongs to same assignment expression as originToken
   */
  abstract isTokenInSameAssignmentExpression(
    testedToken: CodeEditor.IToken,
    originToken: CodeEditor.IToken,
    cell: Cell
  ): boolean
}

