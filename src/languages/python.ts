import { CodeEditor } from "@jupyterlab/codeeditor";
import { _closestMeaningfulToken, LanguageAnalyzer } from "./analyzer";


export interface IMeaningfulSiblings {
  next: CodeEditor.IToken,
  previous: CodeEditor.IToken,
}


type RuleFunction = (
  siblings: IMeaningfulSiblings,
  tokens?: ReadonlyArray<CodeEditor.IToken>,
  position?: number
) => boolean;


// Many of the characteristics could be moved to a new parent class "CLikeLanguageAnalyzer"
export class PythonAnalyzer extends LanguageAnalyzer {

  // idea for improvement:
  //  rename Analyzer to RuleTester, define class Rule, make Rule instances take a callback on init,
  //  possibly add a string with rule's name (it could be displayed as "defined in >for< loop, line 9",
  //  or "imported from xyz module" and in case of multiple hits, user could choose which one to jump to),
  //  and make the rules interface the way to go for other languages.
  definitionRules = [
    this.isStandaloneAssignment,
    this.isImport,
    this.isWithStatement,
    this.isForLoopOrComprehension,
    this.isTupleUnpacking
  ];

  // Matching standalone variable assignment:
  isStandaloneAssignment(siblings: IMeaningfulSiblings) {
    return (
      siblings.next &&
      siblings.next.type === 'operator' &&
      siblings.next.value === '='
    )
  }

  // Matching imports:
  isImport(siblings: IMeaningfulSiblings) {
    return (
      siblings.previous &&
      siblings.previous.type === 'keyword' &&
      siblings.previous.value === 'import'
    )
  }

  // Matching `as`:
  // e.g. `with open('name') as f:` or `except Exception as e:`
  isWithStatement(siblings: IMeaningfulSiblings) {
    return (
      siblings.previous &&
      siblings.previous.type === 'keyword' &&
      siblings.previous.value === 'as'
    )
  }

  // Matching `for` loop and comprehensions:
  isForLoopOrComprehension(siblings: IMeaningfulSiblings) {
    let { previous, next } = siblings;
    return (
      previous &&
      previous.type === 'keyword' &&
      previous.value === 'for' &&
      next &&
      next.type === 'keyword' &&
      next.value === 'in'
    )
  }

  // should be tested with jest
  isDefinition(token: CodeEditor.IToken, i: number) {

    if (token.type === 'variable') {

      let siblings = {
        next: _closestMeaningfulToken(i, this.tokens, +1),
        previous: _closestMeaningfulToken(i, this.tokens, -1)
      };
      let isVariableDefinition: RuleFunction;

      for (isVariableDefinition of this.definitionRules) {
        if (isVariableDefinition(siblings, this.tokens, i)) {
          return true;
        }
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

  isTupleUnpacking(siblings: IMeaningfulSiblings, tokens: ReadonlyArray<CodeEditor.IToken>, i: number) {
    // Matching variables in tuple unpacking:

    // Considering: `a, [b, c], (d, ) = 1, [1, 2], (1,)`, if the tested
    // token is `a`, then the next expected token would be a comma,
    // and then one of following: a variable, an assignment symbol,
    // or an opening bracket (for simplicity brackets can be ignored).
    let commaExpected = true;

    let indexShift = 1;

    // here `nextToken` is any token, not necessarily a meaningful one
    let nextToken = tokens[i + 1];

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
      nextToken = tokens[i + indexShift];
    }

    return false;
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
    originToken: CodeEditor.IToken
  ): boolean {
    // Find tokens between token.offset and otherToken.offset.
    let tokensSet = new Set();

    for (
      let offset = testedToken.offset + 1;
      offset < originToken.offset + 1;
      offset++
    ) {
      let token = this.tokensProvider.getTokenAt(offset);
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
    let terminatingTokens = this._selectTerminatingTokens(tokensBetween);

    let terminatorsAfterAssignment = terminatingTokens.filter(
      token => token.offset > firstAssignment.offset
    );

    if (!terminatorsAfterAssignment.length) {
      return true;
    }

    return false;
  }

  _selectTerminatingTokens(tokens: Array<CodeEditor.IToken>) {
    // terminating tokens are:
    // semicolons and new lines (which are locally outside of brackets)
    let terminatingTokens = [];
    let openedBrackets = 0;
    const openingBrackets = '([{';
    const closingBrackets = ')]}';
    for (let token of tokens) {
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
    return tokens;
  }

}
