import CodeMirror from 'codemirror';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  _ensureFocus,
  _findCell,
  _findTargetCell
} from './notebook_private';

import {
  Cell
} from '@jupyterlab/cells';

import {
  INotebookTracker,
  Notebook
} from "@jupyterlab/notebook";

import {
  CodeMirrorEditor
} from '@jupyterlab/codemirror';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { CodeEditor } from '@jupyterlab/codeeditor';

/**
 * The plugin registration information.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'go-to-definition:editorPlugin',
  requires: [IEditorTracker, INotebookTracker],
  activate: activate,
  autoStart: true
};

export interface IJump {
  /**
   * The token of origin (variable/function usage).
   */
  token: CodeEditor.IToken;
  /**
   * The clicked (or active) element of origin used to find the cell from which
   * the request originated.
   */
  origin: HTMLElement;
  /**
   * Optional mouse event used as a fallback to determine the cell of origin in
   * Firefox 57.
   */
  mouseEvent?: MouseEvent;
}


function jump(
  notebook: Notebook,
  editor: CodeEditor.IEditor,
  jump: IJump
): void {
  // Using `index = this._findCell(editor.host)` does not work,
  // as the host editor has not switched to the clicked cell yet.
  let index;

  // The mouse event is utilized to workaround Firefox's issue.
  if (jump.mouseEvent !== undefined) {
    index = _findTargetCell(notebook, jump.mouseEvent).index;
  } else {
    index = _findCell(notebook, jump.origin);
  }

  let { token, cellIndex } = _findLastDefinition(notebook, jump.token, index);

  // nothing found
  if (!token) {
    return;
  }

  // Prevents event propagation issues
  setTimeout(() => {
    notebook.deselectAll();
    notebook.activeCellIndex = cellIndex;
    _ensureFocus(notebook);
    notebook.mode = 'edit';

    // find out offset for the element
    let activeEditor = notebook.activeCell.editor;

    // place cursor in the line with the definition
    let position = activeEditor.getPositionAt(token.offset);
    activeEditor.setSelection({ start: position, end: position });
  }, 0);
}


const HANDLERS_ON = '_go_to_are_handlers_on';


function connectNotebookHandler(codemirror_editor: CodeMirrorEditor, notebook: Notebook){
  let editor = codemirror_editor.editor;

  if(editor.getOption(HANDLERS_ON)) {
    // this editor instance already has the event handler
    return
  }

  editor.setOption(HANDLERS_ON, true);

  CodeMirror.on(
    editor,
    'mousedown',
    (editor: CodeMirror.Editor, event: MouseEvent) => {
      console.log('aaa');
      //codemirror_editor.addKeydownHandler()
      let target = event.target as HTMLElement;
      const { button, altKey } = event;
      if (altKey && button === 0) {
        // Offset is needed to handle same-cell jumping.
        // To get offset we could either derive it from the DOM
        // or from the tokens. Tokens sound better, but there is
        // no direct link between DOM and tokens.
        // This can be worked around using:
        //    CodeMirror.display.renderView.measure.map
        // (see: https://stackoverflow.com/a/35937312/6646912)
        // or by simply counting the number of tokens before.
        // For completeness - using cursor does not work reliably:
        // const cursor = this.getCursorPosition();
        // const token = this.getTokenForPosition(cursor);

        const classes = ['cm-variable', 'cm-property'];

        if (classes.indexOf(target.className) !== -1) {
          let cellTokens = codemirror_editor.getTokens();
          let lookupName = target.textContent;

          // count tokens with same value that occur before
          // (not all the tokens - to reduce the hurdle of
          // mapping DOM into tokens)
          let usagesBeforeTarget = -1;
          let sibling = target as Node;

          while (sibling != null) {
            if (sibling.textContent === lookupName) {
              usagesBeforeTarget += 1;
            }

            let nextSibling = sibling.previousSibling;

            if (nextSibling == null) {
              // Try to traverse to previous line (if there is one).

              // The additional parent (child) which is traversed
              // both ways is a non-relevant presentation container.
              let thisLine = sibling.parentNode.parentNode as HTMLElement;
              let previousLine = thisLine.previousElementSibling;

              // is is really a line?
              if (
                previousLine &&
                previousLine.className.indexOf('CodeMirror-line') !== -1
              ) {
                nextSibling = previousLine.firstChild.lastChild;
              }
            }
            sibling = nextSibling;
          }

          // select relevant token
          let token = null;
          let matchedTokensCount = 0;
          for (let j = 0; j < cellTokens.length; j++) {
            let testedToken = cellTokens[j];
            if (testedToken.value === lookupName) {
              matchedTokensCount += 1;
              if (matchedTokensCount - 1 === usagesBeforeTarget) {
                token = testedToken;
                break;
              }
            }
          }

          if (token.value !== target.textContent) {
            console.error(
              `Token ${token.value} does not match element ${
                target.textContent
                }`
            );
            // fallback
            token = {
              value: target.textContent,
              offset: 0, // dummy offset
              type:
                target.className.indexOf('cm-variable') !== -1
                  ? 'variable'
                  : 'property'
            };
          }

          jump(
            notebook,
            codemirror_editor,{
              token: token,
              mouseEvent: event,
              origin: target
            })
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }
  );
}


function activate(
  app: JupyterLab,
  fileEditorTracker: IEditorTracker,
  notebookTracker: INotebookTracker
): void {

  // this option is used as a flag to determine if an instance of CodeMirror
  // has been assigned with a handler
  CodeMirror.defineOption(HANDLERS_ON, false, () => {});

  // TODO: make it work in file editor too.
  fileEditorTracker.widgetAdded.connect((sender, widget) => {
    if (widget.content.editor instanceof CodeMirrorEditor) {
      //let codemirror_editor = widget.content.editor;
      //let editor = widget.content.editor.editor;
      console.log(widget.content.editor);
    }
  });

  notebookTracker.widgetAdded.connect((sender, widget) => {

    let notebook = widget.content;
    // btw: notebookTracker.currentWidget.content === notebook

    // timeout ain't elegant but the widgets are not populated at the start-up time
    // (notebook.widgets.length === 1) - some time is needed for that,
    // and I can't see any callbacks for cells.

    // more insane idea would be to have it run once every 2 seconds
    // more reasonable thing would be to create a PR with .onAddCell
    setTimeout(() => {
      // now (notebook.widgets.length is likely > 1)
      notebook.widgets.every((cell) => {

        let codemirror_editor = cell.editor as CodeMirrorEditor;
        connectNotebookHandler(codemirror_editor, notebook);

        return true
      });
    }, 2000);

    // for that cells which will be added later:
    notebook.activeCellChanged.connect((notebook, cell) => {
      if(cell === undefined)
        return;

      let codemirror_editor = cell.editor as CodeMirrorEditor;
      connectNotebookHandler(codemirror_editor, notebook);
    });

  });

}

/**
 * Find the last definition of given variable.
 */
function _findLastDefinition(notebook: Notebook, token: CodeEditor.IToken, stopIndex: number) {
  let definitionToken = null;
  let definitionIndex = null;
  const originToken = token;

  for (let i = 0; i <= stopIndex; i++) {
    let cell = notebook.widgets[i];

    let definitions = findDefinitions(cell.editor as CodeMirrorEditor, token.value);

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
        return !_isTokenInSameAssignmentExpression(
          notebook,
          otherToken,
          token,
          cell
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

/**
 * Check whether testedToken belongs to same assignment expression as originToken
 *
 * #### Notes
 * To verify if token belongs to same assignment expression, the tokens
 * between testedToken and originToken as tested. The token is in same
 * assignment expression if there is an assignment token in between and
 * there are no expression-terminating tokens after such an assignment.
 *
 * We only need to look at the first assignment token, see this example:
 * a = 1; b = a
 *
 * Expression-terminating token is one of following:
 * - new line (if not within brackets)
 * - semicolon
 */
function _isTokenInSameAssignmentExpression(
  notebook: Notebook,
  testedToken: CodeEditor.IToken,
  originToken: CodeEditor.IToken,
  cell: Cell
): boolean {
  // Find tokens between token.offset and otherToken.offset.
  let tokensSet = new Set();

  for (
    let offset = testedToken.offset + 1;
    offset < originToken.offset + 1;
    offset++
  ) {
    let position = cell.editor.getPositionAt(offset);
    let token = cell.editor.getTokenForPosition(position);
    if (token.offset === testedToken.offset) {
      continue;
    }
    tokensSet.add(token);
  }
  let tokensBetween = Array.from(tokensSet);

  // If there is no assignment token, we don't need to worry
  let assignments = tokensBetween.filter(
    token => token.type === 'operator' && token.value.indexOf('=') !== -1
  );
  if (!assignments.length) {
    return false;
  }

  let firstAssignment = assignments.sort(
    (a, b) => (a.offset > b.offset ? 1 : -1)
  )[0];

  // Select terminating tokens:
  // semicolons and new lines (which are locally outside of brackets)
  let terminatingTokens = [];
  let openedBrackets = 0;
  const openingBrackets = '([{';
  const closingBrackets = ')]}';
  for (let token of tokensBetween) {
    // let's assume that the code is properly formatted,
    // and do not check the order of brackets
    if (token.value !== '') {
      if (openingBrackets.includes(token.value)) {
        openedBrackets += 1;
        continue;
      } else if (closingBrackets.includes(token.value)) {
        openedBrackets -= 1;
        continue;
      }
    }
    // empty string is used as a token representing new-line
    let terminator = token.value === ';' || token.value === '';
    // if there is a closing bracket, completing a previously opened one,
    // which proceeds the token of origin, that is fine too (hence <= 0)
    if (openedBrackets <= 0 && terminator) {
      terminatingTokens.push(token);
    }
  }

  let terminatorsAfterAssignment = terminatingTokens.filter(
    token => token.offset > firstAssignment.offset
  );

  if (!terminatorsAfterAssignment.length) {
    return true;
  }

  return false;
}

function findDefinitions(code_mirror_editor: CodeMirrorEditor, name: string): Array<CodeEditor.IToken> {
  // TODO: this could go to the CodeEditor, as it does not depend on CodeMirror directly
  // try to find variable assignment
  let cellTokens = code_mirror_editor.getTokens();

  return Array.from(cellTokens).filter((token, i) => {
    if (token.value !== name) {
      return false;
    }

    if (token.type === 'variable') {
      // Matching standalone variable assignment:
      let nextToken = _closestMeaningfulToken(i, cellTokens, +1);
      if (
        nextToken &&
        nextToken.type === 'operator' &&
        nextToken.value === '='
      ) {
        return true;
      }

      // Matching imports:
      let previousToken = _closestMeaningfulToken(i, cellTokens, -1);
      if (
        previousToken &&
        previousToken.type === 'keyword' &&
        previousToken.value === 'import'
      ) {
        return true;
      }

      // Matching `as`:
      // e.g. `with open('name') as f:` or `except Exception as e:`
      if (
        previousToken &&
        previousToken.type === 'keyword' &&
        previousToken.value === 'as'
      ) {
        return true;
      }

      // Matching `for` loop and comprehensions:
      if (
        previousToken &&
        previousToken.type === 'keyword' &&
        previousToken.value === 'for' &&
        nextToken &&
        nextToken.type === 'keyword' &&
        nextToken.value === 'in'
      ) {
        return true;
      }

      // Matching variables in tuple unpacking:

      // Considering: `a, [b, c], (d, ) = 1, [1, 2], (1,)`, if the tested
      // token is `a`, then the next expected token would be a comma,
      // and then one of following: a variable, an assignment symbol,
      // or an opening bracket (for simplicity brackets can be ignored).
      let commaExpected = true;

      let indexShift = 1;

      // here `nextToken` is any token, not necessarily a meaningful one
      nextToken = cellTokens[i + 1];

      // unpacking with curly braces is not possible
      const openingBrackets = '([';
      const closingBrackets = ')]';
      let openedBrackets = 0;

      // value of token is equal to an empty string for line breaks

      // a line break is the latest when the search should terminate,
      // unless the left-hand tuple is spread over several lines (in brackets)
      while (nextToken && (nextToken.value !== '' || openedBrackets > 0)) {
        if (nextToken.value === '') {
          // ignoring new-lines (when within brackets)
        } else if (openingBrackets.includes(nextToken.value)) {
          openedBrackets += 1;
        } else if (closingBrackets.includes(nextToken.value)) {
          openedBrackets -= 1;
        } else if (nextToken.value === ' ' || nextToken.value === '\t') {
          // ignoring whitespaces
        } else {
          if (nextToken.type === 'operator' && nextToken.value === '=') {
            return true;
          }

          if (commaExpected && nextToken.value !== ',') {
            break;
          }

          commaExpected = !commaExpected;
        }
        indexShift += 1;
        nextToken = cellTokens[i + indexShift];
      }

      // nothing matched
      return false;
    } else if (token.type === 'def') {
      // Matching function definition.

      // We could double-check that an opening parenthesis follows,
      // but we can assume that it is the responsibility of CodeMirror.
      return true;
    } else {
      // nothing matched
      return false;
    }
  });
}

function _closestMeaningfulToken(
  tokenIndex: number,
  tokens: Array<CodeEditor.IToken>,
  direction: number
): CodeEditor.IToken {
  let nextMeaningfulToken = null;
  while (nextMeaningfulToken == null) {
    tokenIndex += direction;
    if (tokenIndex < 0 || tokenIndex >= tokens.length) {
      return null;
    }
    let nextToken = tokens[tokenIndex];
    if (nextToken.type !== '') {
      nextMeaningfulToken = nextToken;
    }
  }
  return nextMeaningfulToken;
}

/**
 * Export the plugin as default.
 */
export default plugin;