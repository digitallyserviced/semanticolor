(function() {
  require('sugar');

  var hash = require('murmurhash3js').x86.hash32;
  var packageName = 'semanticolor';
  var registry = atom.grammars;
  var identifierChar = /((?:@|\$)?[\w-]+)/;
  var ignoredScopes = {
    comment: true,
    primitive: true,
    'storage': true,
    punctuation: true,
    'support.type': true,
    'support.constant': true,
    string: true,
    keyword: true,
    'constant.numeric': true,
    language: true,
  };

  module.exports = {
    create: semanticolorGrammarFactory,
    packageName: packageName
  };

  function colorIndex(str, colorDiversity) {
    return (hash(str) % colorDiversity) + 1;
  }

  function semanticolorGrammarFactory(grammar, affectedScopes, colorDiversity) {
    var semanticolorGrammar = Object.create(grammar);
    semanticolorGrammar.name = 'Semanticolor - ' + grammar.name;
    semanticolorGrammar.packageName = packageName;
    semanticolorGrammar.scopeName = 'identifier';
    semanticolorGrammar.affectedScopes = affectedScopes;
    semanticolorGrammar.colorDiversity = colorDiversity;

    semanticolorGrammar.tokenizeLines = function(text) {
      var result = this.__proto__.tokenizeLines(text);
      return result.map(function(line) {
        return line.map(function(token) {
          addColors(token.value, token.scopes, this.affectedScopes, this.colorDiversity);
          return token;
        });
      });
    };

    semanticolorGrammar.tokenizeLine = function(line, ruleStack, firstLine) {
      var tokenizeResult = this.__proto__.tokenizeLine(line, ruleStack, firstLine);
      var tags = tokenizeResult.tags;
      var tokens = tokenizeResult.tokens;
      var tokenTagIndices = [];
      for (var i = 0; i < tags.length; i++) {
        if (tags[i] > 0) {
          tokenTagIndices.push(i);
        }
      }
      if (tokenTagIndices.length) {
        for (var i = tokens.length - 1; i >= 0; i--) {
          if (!affected(tokens[i].scopes)) {
            continue;
          }
          var subtokens = tokens[i].value.split(identifierChar)
            .filter(function(s) {
              return s.length > 0;
            });
          var replaceIdx = tokenTagIndices[i];
          var replacement = [];
          for (var j = 0; j < subtokens.length; j++) {
            newScope = addColors(subtokens[j], tokens[i].scopes, this.colorDiversity);
            if (newScope) {
              replacement.push(registry.startIdForScope(newScope));
              replacement.push(subtokens[j].length);
              replacement.push(registry.endIdForScope(newScope));
            } else {
              replacement.push(subtokens[j].length);
            }
          }
          if (replacement.length) {
            tags.removeAt(replaceIdx);
            tags.insert(replacement, replaceIdx);
          }
        }
      }
      var result = Object.merge(tokenizeResult, { tags: tags });
      return result;
    };

    registry.addGrammar(semanticolorGrammar);

    return semanticolorGrammar;

    function affected(scopes) {
      for (var ignored in ignoredScopes) {
        if (!ignoredScopes[ignored]) {
          continue;
        }
        var ignore = scopes.any(function(scope) {
          return scope.has(ignored);
        });
        if (ignore) {
          return false;
        }
      }
      return scopes.any(function(scope) {
        return scope.has('source');
      });
    }

    function addColors(str, scopes, colorDiversity) {
      var colorize = false;
      var newScope = null;
      if (!identifierChar.test(str)) {
        return newScope;
      }
      if (affected(scopes)) {
        newScope = semanticolorScope(str, colorDiversity);
        scopes.push(newScope);
      }
      return newScope;
    }

    function semanticolorScope(str, colorDiversity) {
      return 'identifier.semanticolor-' + colorIndex(str, colorDiversity)
    }
  }
}).call(this);
