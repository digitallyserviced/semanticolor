const Sugar = require('sugar');
const semver = require('semver');
const utils = require('./utils');

const hash = require('murmurhash3js').x86.hash32;
const packageName = 'semanticolor';
const registry = atom.grammars;
const textmateRegistry = atom.grammars.textmateRegistry || registry;
const identifierChar = /((?:@|\$)?[\wÀ-ÖØ-öø-ÿ\-$]+)/;
const symbolPrefix = /^(?:@|\$)/;
const debug = require('debug')('semanticolor');

let id = 'identifier.semanticolor-';
let mute = 'semanticolor-mute';
let contrast = 'semanticolor-contrast';
let bg = 'bg';

if (semver.satisfies(atom.getVersion(), '<1.13.0')) {
	id = 'syntax--identifier.syntax--semanticolor-';
	mute = 'syntax--semanticolor-mute';
	contrast = 'syntax--semanticolor-contrast';
	bg = 'syntax--bg';
}

module.exports = {
	create: semanticolorGrammarFactory,
	packageName,
};

function colorIndex(str, colorDiversity) {
	return (hash(str) % colorDiversity) + 1;
}

function semanticolorGrammarFactory(grammar, defaults, options, colorDiversity) {
	let semanticolorGrammar = Object.create(grammar);
	semanticolorGrammar.packageName = packageName;
	semanticolorGrammar.colorDiversity = colorDiversity;
	semanticolorGrammar.defaults = defaults;
	semanticolorGrammar.options = options;
	semanticolorGrammar.name = 'semanticolor - ' + grammar.name;

	if (utils.isTreeSitter(grammar)) {
		semanticolorGrammar.idForScope = (function (scopeName, node) {
			let scope = scopeName || semanticolorGrammar.scopeName;
			let id = this.__proto__.idForScope(scope);
			if (!node || !node.text || node.text.length > 256) {
				if (scopeName) {
					return id;
				}
				return undefined;
			}
			let { actions, includeAllChars } = determineActions(this.defaults, this.options, [scope]);
			let everythingElse = this.options.everythingElse === 'default' ? this.defaults.everythingElse : this.options.everythingElse;
			let newScope = getNewScope(node.text, actions, this.colorDiversity, includeAllChars, everythingElse);
			if (newScope && newScope !== scope) {
				id = this.__proto__.idForScope(newScope);
				return id;
			}
			if (!scopeName) {
				return undefined;
			}
			return id;
		}).bind(semanticolorGrammar);
	} else {
		semanticolorGrammar.tokenizeLine = function (line, ruleStack, firstLine) {
			let tokenizeResult = this.__proto__.tokenizeLine(line, ruleStack, firstLine);
			let tags = tokenizeResult.tags;
			let openScopeTokens = tokenizeResult.openScopeTokens && tokenizeResult.openScopeTokens.slice();
			let tokens = tokenizeResult.tokens;
			let tokenTagIndices = [];
			for (let i = 0; i < tags.length; i++) {
				if (tags[i] > 0) {
					tokenTagIndices.push(i);
				}
			}
			if (tokenTagIndices.length) {
				for (let i = tokens.length - 1; i >= 0; i--) {
					let { actions, includeAllChars } = determineActions(this.defaults, this.options, tokens[i].scopes);
					let subtokens = [tokens[i].value];
					if (!includeAllChars && actions[actions.length - 1] === 'colorize') {
						subtokens = tokens[i].value.split(identifierChar)
							.filter(s => s.length > 0);
					}
					let replaceIdx = tokenTagIndices[i];
					let replacement = [];
					for (let j = 0; j < subtokens.length; j++) {
						let everythingElse = this.options.everythingElse === 'default' ? this.defaults.everythingElse : this.options.everythingElse;
						let newScope = getNewScope(subtokens[j], actions, this.colorDiversity, includeAllChars, everythingElse);
						if (newScope) {
							replacement.push(textmateRegistry.startIdForScope(newScope));
							replacement.push(subtokens[j].length);
							replacement.push(textmateRegistry.endIdForScope(newScope));
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
			let result = Sugar.Object.merge(tokenizeResult, {
				tags,
				openScopeTokens,
			});
			return result;
		};
	}
	debug('creating grammar: ' + semanticolorGrammar.name);

	registry.addGrammar(semanticolorGrammar);

	return semanticolorGrammar;

	function determineActions(defaults, selector, scopes) {
		let actions = [];
		let includeAllChars = false;
		for (let i = 0; i < scopes.length; i++) {
			for (let key in selector) {
				let pattern = new RegExp(key + '(?:\\.|$)');
				let found = pattern.test(scopes[i]);
				if (found) {
					if (key === 'comment' || key === 'string.quoted') {
						includeAllChars = true;
					}
					if (selector[key] === 'default') {
						actions.push(defaults[key]);
					} else {
						actions.push(selector[key]);
					}
				}
			}
		}
		if (!actions.length) {
			actions.push(selector.everythingElse);
		}
		return {
			actions,
			includeAllChars,
		};
	}

	function getNewScope(str, actions, colorDiversity, includeAllChars, defaultAction) {
		let newScope = null;
		let acts = actions.slice();
		while (acts.length) {
			let action = acts.pop();
			switch (action) {
				case 'mute':
					if (str.trim().length === 0) {
						break;
					}
					newScope = mute;
					break;
				case 'contrast':
					if (includeAllChars || identifierChar.test(str) || defaultAction === 'contrast') {
						newScope = contrast;
					} else {
						newScope = getNewScope(str, [defaultAction], colorDiversity, true, defaultAction);
					}
					break;
				case 'colorize':
				case 'colorize-bg':
					if (str.trim().length === 0) {
						break;
					}
					if (includeAllChars || identifierChar.test(str) || defaultAction === 'colorize') {
						let token = str.trim();
						if (symbolPrefix.test(token)) {
							token = token.substring(1);
						}
						newScope = semanticolorScope(token, colorDiversity, action === 'colorize-bg');
					} else {
						newScope = getNewScope(str, [defaultAction], colorDiversity, true, defaultAction);
					}
					break;
				case 'theme':
					return null;
			}
			if (newScope) {
				break;
			}
		}
		return newScope;
	}

	function semanticolorScope(str, colorDiversity, isBg) {
		if (isBg) {
			return id + colorIndex(str, colorDiversity) + '.' + bg;
		}
		return id + colorIndex(str, colorDiversity);
	}
}
