import { CodeJumper } from "./jumpers/jumper";
import { CodeEditor } from "@jupyterlab/codeeditor";
import { IJump } from "./jump";


export function matchToken(tokens: ReadonlyArray<CodeEditor.IToken>, tokenName: string, tokenOccurrence = 1, tokenType = 'variable'): CodeEditor.IToken {
  let matchedTokens = tokens.filter(token => token.value == tokenName && token.type == tokenType);
  return matchedTokens[tokenOccurrence - 1];
}


// TODO: refactor into a factory which accepts language and cwd as options
export class Jumper extends CodeJumper {

  cwd = '';
  language: string = 'python';
  editor: CodeEditor.IEditor;

  constructor(editor: CodeEditor.IEditor) {
    super();
    this.editor = editor;
  }

  get editors() {
    return [this.editor];
  }

  jump_to_definition(jump: IJump) {
    let {token} = this._findLastDefinition(jump.token, 0);

    // nothing found
    if (!token) {
      return;
    }

    let position = this.editor.getPositionAt(token.offset);
    this.editor.setSelection({start: position, end: position});
  }
}
