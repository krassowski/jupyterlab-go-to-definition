import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { CodeEditor } from "@jupyterlab/codeeditor";

import { IJump } from "../jump";
import { chooseLanguageAnalyzer } from "../languages/chooser";
import { CodeMirrorExtension } from "../editors/codemirror";


export abstract class CodeJumper {

  abstract language: string;

  abstract jump(jump: IJump): void

  abstract get editors(): ReadonlyArray<CodeEditor.IEditor>

  /**
   * Find the last definition of given variable.
   */
  protected _findLastDefinition(token: CodeEditor.IToken, stopIndex: number) {
    let definitionToken = null;
    let definitionIndex = null;
    const originToken = token;

    for (let i = 0; i <= stopIndex; i++) {
      let cell_editor = this.editors[i];

      // TODO: if a cell starts with %%[language] magic, use the other language?
      let analyzerClass = chooseLanguageAnalyzer(this.language);

      // TODO: make this dynamic, depending on editor implementation in use (like with languages)
      let editor = new CodeMirrorExtension(cell_editor as CodeMirrorEditor, this);

      let analyzer = new analyzerClass(editor);

      // try to find variable assignment
      let definitions = analyzer.getDefinitions(token.value);


      if (definitions.length) {
        // Get the last definition / assignment that appears before
        // token of origin (is in an earlier cell or has lower offset),
        let filtered = definitions.filter(
          otherToken => i < stopIndex || otherToken.offset < originToken.offset
        );

        // but ignore ones that are part of the same assignment expression,
        // for example in a cell like this:
        // >>> a = 1
        // >>> a = a + 1
        // clicking on the last 'a' should jump to the first line,
        // and not to beginning of the second line.
        filtered = definitions.filter(otherToken => {
          // If otherToken is in previous cell, we don't need to worry.
          if (i < stopIndex) {
            return true;
          }
          return !analyzer.isTokenInSameAssignmentExpression(
            otherToken, token
          );
        });

        if (filtered.length) {
          definitionToken = filtered[filtered.length - 1];
          definitionIndex = i;
        } else if (!definitionToken && i === stopIndex) {
          // but if there is no definition at all, and we are in the last cell,
          // just return the token of origin (the clicked element), so the
          // editor will focus on the clicked element rather than ignore the
          // click altogether.
          definitionToken = token;
          definitionIndex = i;
        }
      }
    }
    return {
      token: definitionToken,
      cellIndex: definitionIndex
    };
  }
}
