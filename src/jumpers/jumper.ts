import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { CodeEditor } from "@jupyterlab/codeeditor";

import { IJump } from "../jump";
import { chooseLanguageAnalyzer } from "../languages/chooser";
import { CodeMirrorExtension } from "../editors/codemirror";


function hasCellMagic(tokens: CodeEditor.IToken[]) {
  return (
    // CodeMirror Python-tokenizer
    (tokens.length >= 3 && tokens[0].value == '%' && tokens[1].value == '%')
    ||
    // CodeMirror R-tokenizer: although IRkernel does not support magics,
    // cell-magic recognition is still needed whe operating on an R-cell
    // inside of IPython notebook.
    (tokens.length >= 2 && tokens[0].value == '%%')
  )
}


const cell_magic_lang_to_tokenizer : any = {
  // on the right-hand side is the CodeMirror mode specification
  // TODO: new class for mode spec?
  'bash': 'bash',
  'R': 'r',
  'python': 'python',
  'python2': {name: 'python', version: 2},
  'python3': {name: 'python', version: 3},
  'javascript': 'javascript',
  'js': 'javascript',
  'svg': 'application/xml',
  'html': 'text/html',
  'latex': 'text/x-stex'
  // not working as for now:
  // 'ruby': 'text/x-ruby',
  // require additional logic/scripting:
  // 'script': '',
  // 'sh': '',
};


export abstract class CodeJumper {

  abstract language: string;

  abstract jump_to_definition(jump: IJump): void

  abstract get editors(): ReadonlyArray<CodeEditor.IEditor>

  protected _getLanguageAnalyzerForCell(cell_editor: CodeEditor.IEditor) {

    let language = this.language;

    // if a cell starts with %%[language] magic, use the other language:
    let tokens = cell_editor.getTokens();

    // TODO: move this out to a separate jupyterlab-extension?
    //  this could be run after each change of cell content

    if (hasCellMagic(tokens)) {
      let magic_name = tokens[0].value == '%' ? tokens[2].value : tokens[1].value;
      if (cell_magic_lang_to_tokenizer.hasOwnProperty(magic_name)) {
        language = magic_name;
        // to get properly parsed tokens for given language,
        // force the CodeMirror tokenizer to use the corresponding mode
        let cm = cell_editor as CodeMirrorEditor;
        cm.editor.setOption('mode', cell_magic_lang_to_tokenizer[language]);
      }
    }

    let analyzerClass = chooseLanguageAnalyzer(language);

    // TODO: make this dynamic, depending on editor implementation in use (like with languages)
    let editor = new CodeMirrorExtension(cell_editor as CodeMirrorEditor, this);

    return new analyzerClass(editor);
  }

  /**
   * Find the last definition of given variable.
   */
  protected _findLastDefinition(token: CodeEditor.IToken, stopIndex: number) {
    let definitionToken = null;
    let definitionIndex = null;
    const originToken = token;

    for (let i = 0; i <= stopIndex; i++) {
      let cell_editor = this.editors[i];

      let analyzer = this._getLanguageAnalyzerForCell(cell_editor);

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
