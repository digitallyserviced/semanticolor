(function() {
	require('sugar');

	var hash = require('murmurhash3js').x86.hash32;
	var packageName = 'semanticolor';
	var registry = atom.grammars;
	var identifierChar = /((?:@|\$)?[\w-]+)/;

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
		semanticolorGrammar.affectedScopes = affectedScopes;
		semanticolorGrammar.colorDiversity = colorDiversity;

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
					var actions = determineActions(this.affectedScopes, tokens[i].scopes);
					if (actions.length === 0 || (actions.any('ignore') && !actions.any('contrast'))) {
						continue;
					}
					var subtokens = [tokens[i].value];
					if (actions[0] === 'colorize') {
						subtokens = tokens[i].value.split(identifierChar)
							.filter(function(s) {
								return s.length > 0;
							});
					}
					var replaceIdx = tokenTagIndices[i];
					var replacement = [];
					for (var j = 0; j < subtokens.length; j++) {
						newScope = getNewScope(subtokens[j], actions, this.colorDiversity);
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

		function determineActions(selector, scopes) {
			var results = [];
			var actions = [];
			for (var key in selector) {
				var found = scopes.any(function(scope) {
					return scope.has(key.replace(/_/g, '.'));
				});
				if (found) {
					actions.push(selector[key]);
				}
			}
			if (actions.find('contrast')) {
				results.push('contrast');
			}
			if (actions.find('ignore')) {
				results.push('ignore');
			}
			if (actions.find('mute')) {
				results.push('mute');
			}
			if (actions.find('colorize')) {
				results.push('colorize');
			} else if (scopes.any(function(scope) {
					return scope.has('source');
				})) {
				results.push('colorize');
			}
			return results;
		}

		function getNewScope(str, actions, colorDiversity) {
			var newScope = null;
			for (var i = 0; i < actions.length; i++) {
				switch (actions[i]) {
					case 'mute':
						newScope = 'semanticolor-mute';
						break;
					case 'contrast':
						if (identifierChar.test(str)) {
							newScope = 'semanticolor-contrast';
						}
						break;
					case 'colorize':
						if (identifierChar.test(str)) {
							newScope = semanticolorScope(str, colorDiversity);
						}
						break;
				}
				if (newScope) {
					break;
				}
			}
			return newScope;
		}

		function semanticolorScope(str, colorDiversity) {
			return 'identifier.semanticolor-' + colorIndex(str, colorDiversity)
		}
	}
}).call(this);
