(function() {
	var Sugar = require('sugar');

	var hash = require('murmurhash3js').x86.hash32;
	var packageName = 'semanticolor';
	var registry = atom.grammars;
	var identifierChar = /((?:@|\$)?[\w-]+)/;
	var symbolPrefix = /^(?:@|\$)/;

	module.exports = {
		create: semanticolorGrammarFactory,
		packageName: packageName
	};

	function colorIndex(str, colorDiversity) {
		return (hash(str) % colorDiversity) + 1;
	}

	function semanticolorGrammarFactory(grammar, options, colorDiversity) {
		var semanticolorGrammar = Object.create(grammar);
		semanticolorGrammar.name = 'semanticolor - ' + grammar.name;
		semanticolorGrammar.packageName = packageName;
		semanticolorGrammar.options = options;
		semanticolorGrammar.colorDiversity = colorDiversity;

		semanticolorGrammar.tokenizeLine = function(line, ruleStack, firstLine) {
			var tokenizeResult = this.__proto__.tokenizeLine(line, ruleStack, firstLine);
			var tags = tokenizeResult.tags;
			var openScopeTokens = tokenizeResult.openScopeTokens && tokenizeResult.openScopeTokens.slice();
			var tokens = tokenizeResult.tokens;
			var tokenTagIndices = [];
			for (var i = 0; i < tags.length; i++) {
				if (tags[i] > 0) {
					tokenTagIndices.push(i);
				}
			}
			if (tokenTagIndices.length) {
				for (var i = tokens.length - 1; i >= 0; i--) {
					var actionsResult = determineActions(this.options, tokens[i].scopes);
					var includeAllChars = actionsResult.includeAllChars;
					var actions = actionsResult.actions;
					if (actions.length === 0 || (Sugar.Array.some(actions, 'theme') && !Sugar.Array.some(actions, 'contrast'))) {
						continue;
					}
					var subtokens = [tokens[i].value];
					if (!includeAllChars && actions[0] === 'colorize') {
						subtokens = tokens[i].value.split(identifierChar)
							.filter(function(s) {
								return s.length > 0;
							});
					}
					var replaceIdx = tokenTagIndices[i];
					var replacement = [];
					for (var j = 0; j < subtokens.length; j++) {
						newScope = getNewScope(subtokens[j], actions, this.colorDiversity, includeAllChars, this.options.everythingElse);
						if (newScope) {
							replacement.push(registry.startIdForScope(newScope));
							replacement.push(subtokens[j].length);
							replacement.push(registry.endIdForScope(newScope));
						} else {
							replacement.push(subtokens[j].length);
						}
					}
					if (replacement.length) {
						Sugar.Array.removeAt(tags, replaceIdx);
						Sugar.Array.insert(tags, replacement, replaceIdx);
					}
				}
			}
			var result = Sugar.Object.merge(tokenizeResult, { tags: tags, openScopeTokens: openScopeTokens });
			return result;
		};

		registry.addGrammar(semanticolorGrammar);

		return semanticolorGrammar;

		function determineActions(selector, scopes) {
			var results = [];
			var actions = [];
			var includeAllChars = false;
			var selectorScopes = {};
			for (var key in selector) {
				var scope = key.replace(/_/g, '.');
				selectorScopes[scope] = selector[key];
			}
			for (var key in selectorScopes) {
				var found = Sugar.Array.some(scopes, function(scope) {
					return scope.includes(key);
				});
				if (found) {
					if (key === 'comment' || key === 'string.quoted') {
						includeAllChars = true;
					}
					actions.push(selectorScopes[key]);
				}
			}
			if (Sugar.Array.find(actions, 'contrast')) {
				results.push('contrast');
			}
			if (Sugar.Array.find(actions, 'theme')) {
				results.push('theme');
			}
			if (Sugar.Array.find(actions, 'mute')) {
				results.push('mute');
			}
			if (Sugar.Array.find(actions, 'colorize')) {
				results.push('colorize');
			}
			if (results.length === 0) {
				results.push(selector.everythingElse);
			}
			return { actions: results, includeAllChars: includeAllChars };
		}

		function getNewScope(str, actions, colorDiversity, includeAllChars, defaultAction) {
			var newScope = null;
			for (var i = 0; i < actions.length; i++) {
				switch (actions[i]) {
					case 'mute':
						if (str.trim().length === 0) {
							break;
						}
						newScope = 'semanticolor-mute';
						break;
					case 'contrast':
						if (includeAllChars || identifierChar.test(str) || defaultAction === 'contrast') {
							newScope = 'semanticolor-contrast';
						} else {
							newScope = getNewScope(str, [defaultAction], colorDiversity, true, defaultAction);
						}
						break;
					case 'colorize':
						if (str.trim().length === 0) {
							break;
						}
						if (includeAllChars || identifierChar.test(str) || defaultAction === 'colorize') {
							var token = str;
							if (symbolPrefix.test(token)) {
								token = token.substring(1);
							}
							newScope = semanticolorScope(token, colorDiversity);
						} else {
							newScope = getNewScope(str, [defaultAction], colorDiversity, true, defaultAction);
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
