(function() {
	var Sugar = require('sugar');

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

	function semanticolorGrammarFactory(grammar, options, colorDiversity) {
		var semanticolorGrammar = Object.create(grammar);
		semanticolorGrammar.name = 'semanticolor - ' + grammar.name;
		semanticolorGrammar.packageName = packageName;
		semanticolorGrammar.options = options;
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
					var actionsResult = determineActions(this.options, tokens[i].scopes);
					var specialCase = actionsResult.specialCase;
					var actions = actionsResult.actions;
					if (actions.length === 0 || (Sugar.Array.some(actions, 'theme') && !Sugar.Array.some(actions, 'contrast'))) {
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
						newScope = getNewScope(subtokens[j], actions, this.colorDiversity, specialCase);
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
			var result = Sugar.Object.merge(tokenizeResult, { tags: tags });
			return result;
		};

		registry.addGrammar(semanticolorGrammar);

		return semanticolorGrammar;

		function determineActions(selector, scopes) {
			var results = [];
			var actions = [];
			var specialCase = false;
			for (var key in selector) {
				var found = Sugar.Array.some(scopes, function(scope) {
					return scope.includes(key.replace(/_/g, '.'));
				});
				if (found) {
					if (key === 'comment' || key === 'string') {
						specialCase = true;
					}
					actions.push(selector[key]);
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
			} else if (Sugar.Array.some(scopes, function(scope) {
					return scope.includes('source');
				})) {
				results.push('colorize');
			}
			return { actions: results, specialCase: specialCase };
		}

		function getNewScope(str, actions, colorDiversity, specialCase) {
			var newScope = null;
			for (var i = 0; i < actions.length; i++) {
				switch (actions[i]) {
					case 'mute':
						newScope = 'semanticolor-mute';
						break;
					case 'contrast':
						if (specialCase || identifierChar.test(str)) {
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
