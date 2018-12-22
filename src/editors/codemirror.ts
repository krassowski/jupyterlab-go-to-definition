import CodeMirror from "codemirror";

import { CodeMirrorEditor } from "@jupyterlab/codemirror";
import { CodeJumper } from "../jumpers/jumper";
import { IEditorExtension, KeyModifier } from "./editor";


const HANDLERS_ON = '_go_to_are_handlers_on';


export class CodeMirrorExtension implements IEditorExtension {

  editor: CodeMirrorEditor;
  jumper: CodeJumper;
  static modifierKey: KeyModifier;

  constructor(editor: CodeMirrorEditor, jumper: CodeJumper) {
    this.editor = editor;
    this.jumper = jumper;
  }

  static configure() {
    // this option is used as a flag to determine if an instance of CodeMirror
    // has been assigned with a handler
    CodeMirror.defineOption(HANDLERS_ON, false, () => {
    });
  }

  getTokens() {
    return this.editor.getTokens()
  }

  connect() {

    let editor = this.editor.editor;

    if (editor.getOption(HANDLERS_ON)) {
      // this editor instance already has the event handler
      return;
    }

    editor.setOption(HANDLERS_ON, true);

    CodeMirror.on(
      editor,
      'mousedown',
      (editor: CodeMirror.Editor, event: MouseEvent) => {
        //codemirror_editor.addKeydownHandler()
        let target = event.target as HTMLElement;
        const {button} = event;
        if (button === 0 && event.getModifierState(CodeMirrorExtension.modifierKey as string)) {

          const classes = ['cm-variable', 'cm-property'];

          if (classes.indexOf(target.className) !== -1) {
            let lookupName = target.textContent;

            let token = this.selectToken(lookupName, target);

            this.jumper.jump({
              token: token,
              mouseEvent: event,
              origin: target
            });
          }
          event.preventDefault();
          event.stopPropagation();
        }
      }
    );
  }

  selectToken(lookupName: string, target: HTMLElement) {
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

    let cellTokens = this.editor.getTokens();

    let usagesBeforeTarget = CodeMirrorExtension._countUsagesBefore(lookupName, target);

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

    // verify token
    if (token.value !== lookupName) {
      console.error(
        `Token ${token.value} does not match element ${lookupName}`
      );
      // fallback
      token = {
        value: lookupName,
        offset: 0, // dummy offset
        type:
          target.className.indexOf('cm-variable') !== -1
            ? 'variable'
            : 'property'
      };
    }

    return token;
  }

  static _countUsagesBefore(lookupName: string, target: Node) {

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

    return usagesBeforeTarget;
  }
}
