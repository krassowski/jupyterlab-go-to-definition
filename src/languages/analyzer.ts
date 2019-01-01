import { CodeEditor } from "@jupyterlab/codeeditor";

import { ITokensProvider } from "../editors/editor";


export abstract class LanguageAnalyzer {

  tokens: Array<CodeEditor.IToken>;
  tokensProvider: ITokensProvider;
  /**
   * Name of a variable for which a definition is sought
   */

  constructor(tokensProvider: ITokensProvider) {
    this.tokensProvider = tokensProvider;
  }

  abstract isDefinition(token: CodeEditor.IToken, i: number): boolean

  nameMatches(name: string, token: CodeEditor.IToken) {
    return token.value === name;
  }

  getDefinitions(variable: string) {
    this.tokens = this.tokensProvider.getTokens();

    return Array.from(this.tokens)
    .filter(
      (token, i) => this.nameMatches(variable, token) && this.isDefinition(token, i)
    );
  }

  /**
   * Check whether testedToken belongs to same assignment expression as originToken
   */
  abstract isTokenInSameAssignmentExpression(
    testedToken: CodeEditor.IToken,
    originToken: CodeEditor.IToken
  ): boolean

}

export function _closestMeaningfulToken(
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
