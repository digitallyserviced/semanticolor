const SemanticolorView = require('./semanticolor-view');
const CompositeDisposable = require('atom').CompositeDisposable;
const SemanticolorGrammarFactory = require('./semanticolor-grammar');

const _ = require('lodash');
const Sugar = require('sugar');
const debug = require('debug')('semanticolor');

const fs = require('fs');
const path = require('path');

let lessFile = path.join(__dirname, '..', 'styles', 'semanticolor.less');
let grammarListFile = path.join(__dirname, 'grammars.txt');
let ignoredFileTypes = ['md', 'sh', 'cmd', 'bat', 'diff'];
let forceIncludeFileTypes = ['php', 'html', 'xml'];

let grammars = {};
let options = ['contrast', 'mute', 'theme', 'colorize', 'defer'];
let config = {
	colorOptions: {
		description: 'Options that affect how colors are generated.',
		type: 'object',
		order: 0,
		properties: {
			hues: {
				type: 'integer',
				title: 'hues',
				description: 'Fewer colors may make them easier to distinguish, but they will be repeated more often.',
				minimum: 8,
				default: 700,
				maximum: 700,
				order: 1
			},
			saturation: {
				type: 'number',
				title: 'saturation',
				description: 'Color stauration (0 to 100%).',
				minimum: 0.1,
				default: 90,
				maximum: 100,
				order: 2
			},
			luminosity: {
				type: 'number',
				title: 'luminosity',
				description: 'Color luminosity (0 to 100%).',
				minimum: 0.1,
				default: 50,
				maximum: 100,
				order: 3
			},
			fade: {
				type: 'number',
				title: 'fade',
				description: 'Color fade (0 to 100%).',
				minimum: 0.1,
				default: 40,
				maximum: 100,
				order: 4
			}
		}
	}
};

let editorOptions = {
	type: 'object',
	description: 'Options that affect how colors are applied.',
	collapsed: true,
	properties: {
		enabled: {
			type: 'boolean',
			title: 'Enabled',
			default: 'true',
			order: 0
		},
		letiable: {
			type: 'string',
			title: 'Variables',
			default: 'colorize',
			enum: options,
			order: 1
		},
		comment: {
			type: 'string',
			title: 'Comments',
			default: 'contrast',
			enum: options,
			order: 2
		},
		primitive: {
			type: 'string',
			title: 'Primitives',
			default: 'mute',
			enum: options,
			order: 3
		},
		storage_modifier: {
			type: 'string',
			title: 'Storage modifiers',
			default: 'mute',
			enum: options,
			order: 4
		},
		storage_type: {
			type: 'string',
			title: 'Storage types',
			default: 'mute',
			enum: options,
			order: 5
		},
		support_type: {
			type: 'string',
			title: 'Support types',
			default: 'colorize',
			enum: options,
			order: 6
		},
		language: {
			type: 'string',
			title: 'Language elements',
			default: 'mute',
			enum: options,
			order: 7
		},
		keyword: {
			type: 'string',
			title: 'Keywords',
			default: 'mute',
			enum: options,
			order: 8
		},
		operator: {
			type: 'string',
			title: 'Operators',
			default: 'mute',
			enum: options,
			order: 9
		},
		punctuation: {
			type: 'string',
			title: 'Punctuation',
			default: 'defer',
			enum: options,
			order: 10
		},
		markup: {
			type: 'string',
			title: 'Markup',
			default: 'defer',
			enum: options,
			order: 11
		},
		string_quoted: {
			type: 'string',
			title: 'String constants',
			default: 'theme',
			enum: options,
			order: 12
		},
		regexp: {
			type: 'string',
			title: 'Regular expressions',
			default: 'theme',
			enum: options,
			order: 13
		},
		support_constant: {
			type: 'string',
			title: 'Support constants',
			default: 'theme',
			enum: options,
			order: 14
		},
		constant_numeric: {
			type: 'string',
			title: 'Numeric constants',
			default: 'theme',
			enum: options,
			order: 15
		},
		source: {
			type: 'string',
			title: 'Source',
			default: 'colorize',
			enum: options,
			order: 16
		},
		name: {
			type: 'string',
			title: 'Name',
			default: 'colorize',
			enum: options,
			order: 17
		},
		'attribute-name': {
			type: 'string',
			title: 'Attribute name',
			default: 'colorize',
			enum: options,
			order: 18
		},
		everythingElse: {
			type: 'string',
			title: 'Everything else',
			default: 'theme',
			enum: options,
			order: 19
		}
	}
};

let grammarList = [];
try {
	grammarList = Sugar.Array.compact(fs.readFileSync(grammarListFile, { encoding: 'utf-8' }).split(/\r\n|\r|\n/), true);
} catch (e) {
	grammarList = [];
}

for (let i = 0; i < grammarList.length; i++) {
	addGrammarToConfig(grammarList[i]);
}

function getGrammarName(grammar) {
	let result = grammar.name + ' (' + grammar.packageName + ')';
	return result;
}

function getGrammarParamNameFromGrammarName(grammarName) {
	return Sugar.String.camelize(Sugar.String.parameterize(grammarName), false);
}

function addGrammarToConfig(grammarName) {
	let options = Sugar.Object.clone(editorOptions);
	options.title = grammarName;
	config[getGrammarParamNameFromGrammarName(grammarName)] = options;
}

function writeGrammarListFile() {
	let fileContents = '';
	for (let i = 0; i < grammarList.length; i++) {
		fileContents += grammarList[i] + '\n';
	}
	fs.writeFileSync(grammarListFile, fileContents, { encoding: 'utf-8' });
}

let Semanticolor = {
	config: config,
	semanticolorView: SemanticolorView,
	modalPanel: SemanticolorView,
	disposables: new CompositeDisposable(),
	updateLessStylesheet: function(skipReload) {
		let cfg = atom.config.get('semanticolor').colorOptions;
		let less = makeLess(cfg.hues, cfg.saturation, cfg.luminosity, cfg.fade);
		let written = false;
		try {
			let currentLess = fs.readFileSync(lessFile, { encoding: 'utf-8' });
			if (currentLess !== less) {
				fs.writeFileSync(lessFile, less, { encoding: 'utf-8' });
				written = true;
			}
			if (written) {
				atom.notifications.addSuccess('Rewrote new colors...', {
					detail: 'Reloading with stylesheet of ' + cfg.hues + ' possible colors.'
				});
				if (!skipReload) {
					this.confirmReload();
				}
			}
		} catch (e) {
			atom.notifications.addError('No initial colors configured...', {
				detail: 'Updating stylesheet with default of ' + this.config.colorOptions.hues.default+
					' possible colors.'
			});
			try {
				less = makeLess(this.config.colorOptions.hues.default, this.config.colorOptions.saturation.default,
					this.config.colorOptions.luminosity.default, this.config.colorOptions.fade.default);
				written = fs.writeFileSync(lessFile, less, { encoding: 'utf-8' });
			} catch (err) {
				debug(err);
				atom.notifications.addError(e.code + ' : ' + e.message, {
					detail: 'Something failed. Open an issue with me!'
				});
			}
		}

		return written;

		function makeLess(hues, saturation, luminosity, fade) {
			return '@hues: ' + hues + ';\n' +
				'@saturation: ' + saturation + '%;\n' +
				'@luminosity: ' + luminosity + '%;\n' +
				'@fade: ' + fade + '%;';
		}
	},
	activate: function() {
		this.updateLessStylesheet(true);
		this.deactivated = false;
		this.semanticolorView = new SemanticolorView();
		let cfg = atom.config.get('semanticolor');
		for (let key in cfg) {
			if (key === 'colorOptions') {
				continue;
			}
			for (let scope in cfg[key]) {
				if (!editorOptions.properties[scope]) {
					delete cfg[key][scope];
				}
			}
		}
		atom.config.set('semanticolor', cfg);

		let temp = atom.grammars.getGrammars();
		for (let i = 0; i < temp.length; i++) {
			createGrammar(temp[i]);
		}

		atom.grammars.onDidAddGrammar(function(grammar) {
			createGrammar(grammar);
		});

		function createGrammar(grammar) {
			let paramName = tryAddGrammarToConfig(grammar);
			if (paramName && cfg[paramName].enabled) {
				grammars[paramName] = SemanticolorGrammarFactory.create(grammar, cfg[paramName], cfg.colorOptions.hues);
			}
		}

		function tryAddGrammarToConfig(grammar) {
			let grammarName = getGrammarName(grammar);
			let supported = isSupportedGrammar(grammar);
			let inGrammarList = grammarList.includes(grammarName);

			if (inGrammarList && supported) {
				return getGrammarParamNameFromGrammarName(grammarName);
			} else if (inGrammarList) {
				Sugar.Array.remove(grammarList, grammarName);
				writeGrammarListFile();
				debug('removed ' + grammarName, grammar);
				Semanticolor.confirmReload();
				return null;
			}

			if (supported) {
				grammarList.push(grammarName);
				writeGrammarListFile();
				debug('added ' + grammarName, grammar);
				Semanticolor.confirmReload();
			}
			return null;
		}

		function isSupportedGrammar(grammar) {
			let result = false;
			if (grammar.packageName !== SemanticolorGrammarFactory.packageName &&
				grammar.fileTypes.length > 0 &&
				((grammar.scopeName.includes('source') &&
						Sugar.Array.intersect(grammar.fileTypes, ignoredFileTypes).length == 0) ||
					Sugar.Array.intersect(grammar.fileTypes, forceIncludeFileTypes).length > 0)) {
				result = true;
			}
			return result;
		}

		this.disposables.add(atom.workspace.observeTextEditors(enable));

		setTimeout(enableEditors, 1000);

		function enableEditors() {
			let editors = atom.workspace.getTextEditors();
			let enabled = 0;
			for (let i = 0; i < editors.length; i++) {
				if (enable(editors[i])) {
					enabled++;
				}
			}
			if (enabled > 0) {
				setTimeout(enableEditors, 1000);
			}
		}

		this.disposables.add(atom.config.onDidChange('semanticolor', function(change) {
			if (Semanticolor.deactivated) return;
			_.debounce(function() {
				Semanticolor.updateLessStylesheet(change.newValue.colorOptions.hues === change.oldValue.colorOptions.hues);
				let reload = !Sugar.Object.isEqual(change.newValue.colorOptions.hues, change.oldValue.colorOptions.hues);
				for (let prop in change.newValue) {
					if (prop !== 'colorOptions' &&
						!Sugar.Object.isEqual(change.newValue[prop], change.oldValue[prop])) {
						reload = true;
						break;
					}
				}
				if (reload) {
					Semanticolor.confirmReload();
				}
			}, 1000)();
		}));

		function enable(editor) {
			let grammar = editor.getGrammar();
			let paramName = getGrammarParamNameFromGrammarName(getGrammarName(grammar));
			if (grammars[paramName]) {
				editor.setGrammar(grammars[paramName]);
				return true;
			}
			return false;
		}
	},
	confirmReload: function() {
		if (this.deactivated) {
			return;
		}
		this.modalPanel = atom.workspace.addModalPanel({
			item: this.semanticolorView.getElement(),
			visible: true
		});
	},
	deactivate: function() {
		this.deactivated = true;
		if (this.modalPanel && typeof this.modalPanel.destroy === 'function') {
			this.modalPanel.destroy();
		}
		let disposable = this.disposables;
		this.disposables = new CompositeDisposable();
		disposable.dispose();
		return this.semanticolorView.destroy();
	},
};

module.exports = Semanticolor;
