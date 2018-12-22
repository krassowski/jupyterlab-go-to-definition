import { CodeEditor } from "@jupyterlab/codeeditor";
import { LanguageAnalyzer } from "./analyzer";


// Many of the characteristics could be moved to a new parent class "CLikeLanguageAnalyzer"
export class PythonAnalyzer extends LanguageAnalyzer {

  nameMatches(token: CodeEditor.IToken) {
    return token.value === this.name;
  }

  isDefinition(token: CodeEditor.IToken, i: number) {

    if (!this.nameMatches(token))
      return false;

    if (token.type === 'variable') {
      // Matching standalone variable assignment:
      let nextToken = _closestMeaningfulToken(i, this.tokens, +1);
      if (
        nextToken &&
        nextToken.type === 'operator' &&
        nextToken.value === '='
      ) {
        return true;
      }

      // Matching imports:
      let previousToken = _closestMeaningfulToken(i, this.tokens, -1);
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
      nextToken = this.tokens[i + 1];

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
        nextToken = this.tokens[i + indexShift];
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
  isTokenInSameAssignmentExpression(
    testedToken: CodeEditor.IToken,
    originToken: CodeEditor.IToken,
    editor: CodeEditor.IEditor
  ): boolean {
    // Find tokens between token.offset and otherToken.offset.
    let tokensSet = new Set();

    for (
      let offset = testedToken.offset + 1;
      offset < originToken.offset + 1;
      offset++
    ) {
      let position = editor.getPositionAt(offset);
      let token = editor.getTokenForPosition(position);
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
