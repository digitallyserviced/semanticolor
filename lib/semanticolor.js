const CompositeDisposable = require('atom').CompositeDisposable;
const SemanticolorGrammarFactory = require('./semanticolor-grammar');
const semanticolorConfig = require('./config');

const _ = require('lodash');
const Sugar = require('sugar');
const debug = require('debug')('semanticolor');

const fs = require('fs');
const path = require('path');

let lessFile = path.join(__dirname, '..', 'styles', 'semanticolor.less');
let grammarListFile = path.join(__dirname, 'grammars.txt');
let ignoredFileTypes = ['md', 'sh', 'cmd', 'bat', 'diff', 'Dockerfile', 'json'];
let forceIncludeFileTypes = ['php', 'html', 'xml', 'vue'];

let grammars = {};
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
				'default': 700,
				maximum: 700,
				order: 1,
			},
			saturation: {
				type: 'number',
				title: 'saturation',
				description: 'Color stauration (0 to 100%).',
				minimum: 0.1,
				'default': 90,
				maximum: 100,
				order: 2,
			},
			luminosity: {
				type: 'number',
				title: 'luminosity',
				description: 'Color luminosity (0 to 100%).',
				minimum: 0.1,
				'default': 50,
				maximum: 100,
				order: 3,
			},
			fade: {
				type: 'number',
				title: 'fade',
				description: 'Color fade (0 to 100%).',
				minimum: 0.1,
				'default': 40,
				maximum: 100,
				order: 4,
			},
		},
	},
	defaults: Object.assign({ order: 1 }, semanticolorConfig.base),
};

let grammarList = [];
try {
	grammarList = Sugar.Array.compact(fs.readFileSync(grammarListFile, { encoding: 'utf-8' })
		.split(/\r\n|\r|\n/), true);
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
	let options = Sugar.Object.clone(semanticolorConfig.empty);
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

let defaults = {};

function getOptions(options) {
	let selector = {};
	for (let key in options) {
		let scope = key.replace(/_/g, '.');
		selector[scope] = options[key];
	}
	return selector;
}

function enable(editor) {
	let grammar = editor.getGrammar();
	let paramName = getGrammarParamNameFromGrammarName(getGrammarName(grammar));
	if (grammars[paramName]) {
		editor.setGrammar(grammars[paramName]);
	}
}

let Semanticolor = {
	config,
	disposables: new CompositeDisposable(),
	updateLessStylesheet: function () {
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
				atom.notifications.addSuccess('Rewrote new colors...', { detail: 'Reloading with stylesheet of ' + cfg.hues + ' possible colors.' });
			}
		} catch (e) {
			atom.notifications.addError('No initial colors configured...', {
				detail: 'Updating stylesheet with default of ' + this.config.colorOptions.hues.default +
					' possible colors.',
			});
			try {
				less = makeLess(this.config.colorOptions.hues.default, this.config.colorOptions.saturation.default,
					this.config.colorOptions.luminosity.default, this.config.colorOptions.fade.default);
				written = fs.writeFileSync(lessFile, less, { encoding: 'utf-8' });
			} catch (err) {
				debug(err);
				atom.notifications.addError(e.code + ' : ' + e.message, { detail: 'Something failed. Open an issue with me!' });
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
	activate: function () {
		this.updateLessStylesheet(true);
		this.deactivated = false;
		let cfg = atom.config.get('semanticolor');
		for (let key in cfg) {
			if (key === 'colorOptions') {
				continue;
			}
			for (let scope in cfg[key]) {
				if (!semanticolorConfig.empty.properties[scope]) {
					delete cfg[key][scope];
				}
			}
		}
		atom.config.set('semanticolor', cfg);

		let temp = atom.grammars.getGrammars();
		for (let i = 0; i < temp.length; i++) {
			createGrammar(temp[i]);
		}

		atom.grammars.onDidAddGrammar(function (grammar) {
			// Don't bother on unload
			if (!atom.workspace) {
				return;
			}

			createGrammar(grammar);
		});

		function createGrammar(grammar) {
			let paramName = tryAddGrammarToConfig(grammar);
			let cfg = atom.config.get('semanticolor');
			let options;
			if (paramName && cfg[paramName] && cfg[paramName].enabled) {
				options = getOptions(cfg[paramName]);
			} else if (paramName && !cfg[paramName]) {
				options = defaults;
			}
			if (options) {
				grammars[paramName] = SemanticolorGrammarFactory.create(grammar, defaults, options, cfg.colorOptions.hues);
			}
					// Activate grammar on existing text editors with matching grammar
			atom.workspace.getTextEditors()
				.filter(editor => editor.getGrammar().name == grammar.name)
				.map(enable);
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
				setTimeout(Semanticolor.reload);
				return null;
			}

			if (supported) {
				grammarList.push(grammarName);
				writeGrammarListFile();
				addGrammarToConfig(grammarName);
				debug('added ' + grammarName, grammar);
				setTimeout(Semanticolor.reload);
				return getGrammarParamNameFromGrammarName(grammarName);
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

		this.disposables.add(atom.config.onDidChange('semanticolor', function (change) {
			if (Semanticolor.deactivated) {return;}
			_.debounce(function () {
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
					setTimeout(Semanticolor.reload);
				}
			}, 1000)();
		}));

		Semanticolor.reload();
	},
	//testing testing

	reload: function () {
		if (this.deactivated) {
			return;
		}
		let cfg = atom.config.get('semanticolor');
		defaults = getOptions(cfg.defaults);
		for (let prop in cfg) {
			if (prop !== 'colorOptions' && prop !== 'defaults' && grammars[prop]) {
				grammars[prop].defaults = defaults;
				grammars[prop].options = getOptions(cfg[prop]);
				grammars[prop].colorDiversity = cfg.colorOptions.hues;
				for (let editor of atom.workspace.getTextEditors()) {
					if (editor.getGrammar() === grammars[prop]) {
						editor.setGrammar(grammars[prop].__proto__);
					}
					if (!this.deactivated && cfg[prop].enabled) {
						enable(editor);
					}
				}
			}
		}
	},

	deactivate: function () {
		this.deactivated = true;
		let disposable = this.disposables;
		this.disposables = new CompositeDisposable();
		return disposable.dispose();
	},
};

module.exports = Semanticolor;
