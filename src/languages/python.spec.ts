import { expect } from 'chai';

import { CodeEditor } from "@jupyterlab/codeeditor";
import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { CodeMirrorTokensProvider } from "../editors/codemirror/tokens";

import { _closestMeaningfulToken } from "./analyzer";
import { PythonAnalyzer } from './python';


describe('PythonAnalyzer', () => {
  let analyzer: PythonAnalyzer;
  let editor: CodeMirrorEditor;
  let tokensProvider: CodeMirrorTokensProvider;
  let model: CodeEditor.Model;
  let host: HTMLElement;

  function tokenNeighbourhood(tokenName: string, tokenOccurrence=1, tokenType='variable') {
    let tokens = tokensProvider.getTokens();
    let matchedTokens = tokens.filter(token => token.value == tokenName && token.type == tokenType);
    let token = matchedTokens[tokenOccurrence - 1];
    let tokenId = tokens.indexOf(token);

    return {
      next: _closestMeaningfulToken(tokenId, tokens, +1),
      previous: _closestMeaningfulToken(tokenId, tokens, -1)
    };
  }

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);

    model = new CodeEditor.Model({ mimeType: 'text/x-python' });
    editor = new CodeMirrorEditor({ host, model, config: {mode: 'python'} });
    tokensProvider = new CodeMirrorTokensProvider(editor);
    analyzer = new PythonAnalyzer(tokensProvider);

  });

  afterEach(() => {
    editor.dispose();
    document.body.removeChild(host);
  });

  describe('#isStandaloneAssignment()', () => {

    it('should recognize assignments', () => {
      model.value.text = 'x = 1';
      expect(analyzer.isStandaloneAssignment(tokenNeighbourhood('x'))).to.be.true
    });

    it('should ignore increments', () => {
      model.value.text = 'x += 1';
      expect(analyzer.isStandaloneAssignment(tokenNeighbourhood('x'))).to.be.false
    })
  });

  describe('#isForLoopOrComprehension', () => {

    it('should recognize variables declared inside of loops', () => {
      model.value.text = 'for x in range(10): pass';
      expect(analyzer.isForLoopOrComprehension(tokenNeighbourhood('x'))).to.be.true;
    });

    it('should recognize list and set comprehensions', () => {
      // list
      model.value.text = '[x for x in range(10)]';
      expect(analyzer.isForLoopOrComprehension(tokenNeighbourhood('x', 2))).to.be.true;

      // with new lines
      model.value.text = '[\nx\nfor x in range(10)\n]';
      expect(analyzer.isForLoopOrComprehension(tokenNeighbourhood('x', 2))).to.be.true;

      // set
      model.value.text = '{x for x in range(10)}';
      expect(analyzer.isForLoopOrComprehension(tokenNeighbourhood('x', 2))).to.be.true;
    });

  })
});
