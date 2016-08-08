(function() {
	var Semanticolor;
	var SemanticolorView = require('./semanticolor-view');
	var CompositeDisposable = require('atom').CompositeDisposable;
	var SemanticolorGrammarFactory = require('./semanticolor-grammar');

	var _ = require('lodash');
	var Sugar = require('sugar');

	var fs = require('fs');
	var path = require('path');

	var lessFile = path.join(__dirname, '..', 'styles', 'semanticolor.less');
	var grammarListFile = path.join(__dirname, 'grammars.txt');
	var ignoredFileTypes = ['md', 'diff', 'json', 'cson', 'editorconfig', 'gitconfig'];

	var grammars = {};
	var options = ['contrast', 'mute', 'theme', 'colorize'];
	var config = {
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

	var editorOptions = {
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
			comment: {
				type: 'string',
				title: 'Comments',
				default: 'contrast',
				enum: options,
				order: 1
			},
			primitive: {
				type: 'string',
				title: 'Primitives',
				default: 'mute',
				enum: options,
				order: 2
			},
			storage_modifier: {
				type: 'string',
				title: 'Storage modifiers',
				default: 'mute',
				enum: options,
				order: 3
			},
			storage_type: {
				type: 'string',
				title: 'Storage types',
				default: 'mute',
				enum: options,
				order: 4
			},
			support_type: {
				type: 'string',
				title: 'Support types',
				default: 'colorize',
				enum: options,
				order: 5
			},
			language: {
				type: 'string',
				title: 'Language elements',
				default: 'mute',
				enum: options,
				order: 6
			},
			keyword: {
				type: 'string',
				title: 'Keywords',
				default: 'mute',
				enum: options,
				order: 7
			},
			operator: {
				type: 'string',
				title: 'Operators',
				default: 'mute',
				enum: options,
				order: 8
			},
			punctuation: {
				type: 'string',
				title: 'Punctuation',
				default: 'mute',
				enum: options,
				order: 9
			},
			markup: {
				type: 'string',
				title: 'Markup',
				default: 'theme',
				enum: options,
				order: 10
			},
			string: {
				type: 'string',
				title: 'String constants',
				default: 'theme',
				enum: options,
				order: 11
			},
			support_constant: {
				type: 'string',
				title: 'Support constants',
				default: 'theme',
				enum: options,
				order: 12
			},
			constant_numeric: {
				type: 'string',
				title: 'Numeric constants',
				default: 'theme',
				enum: options,
				order: 13
			}
		}
	};

	var grammarList = [];
	try {
		grammarList = Sugar.Array.compact(fs.readFileSync(grammarListFile, { encoding: 'utf-8' }).split(/\r\n|\r|\n/), true);
	} catch (e) {
		grammarList = [];
	}

	for (var i = 0; i < grammarList.length; i++) {
		addGrammarToConfig(grammarList[i]);
	}

	function getGrammarName(grammar) {
		var result = grammar.name + ' (' + grammar.packageName + ')';
		return result;
	}

	function getGrammarParamNameFromGrammarName(grammarName) {
		return Sugar.String.camelize(Sugar.String.parameterize(grammarName), false);
	}

	function addGrammarToConfig(grammarName) {
		var options = Sugar.Object.clone(editorOptions);
		options.title = grammarName;
		config[getGrammarParamNameFromGrammarName(grammarName)] = options;
	}

	function writeGrammarListFile() {
		var fileContents = '';
		for (var i = 0; i < grammarList.length; i++) {
			fileContents += grammarList[i] + '\n';
		}
		fs.writeFileSync(grammarListFile, fileContents, { encoding: 'utf-8' });
	}

	module.exports = Semanticolor = {
		config: config,
		semanticolorView: SemanticolorView,
		modalPanel: SemanticolorView,
		disposables: new CompositeDisposable(),
		updateLessStylesheet: function(skipReload) {
			var cfg = atom.config.get('semanticolor').colorOptions;
			var less = makeLess(cfg.hues, cfg.saturation, cfg.luminosity, cfg.fade);
			var written = false;
			try {
				var currentLess = fs.readFileSync(lessFile, { encoding: 'utf-8' });
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
					console.log(err);
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
		activate: function(state) {
			this.updateLessStylesheet(true);
			this.deactivated = false;
			this.semanticolorView = new SemanticolorView();
			var cfg = atom.config.get('semanticolor');
			for (var key in cfg) {
				if (!Semanticolor.config[key]) {
					delete cfg[key];
				}
			}
			atom.config.set('semanticolor', cfg);

			var temp = atom.grammars.getGrammars();
			for (var i = 0; i < temp.length; i++) {
				createGrammar(temp[i]);
			}

			atom.grammars.onDidAddGrammar(function(grammar) {
				createGrammar(grammar);
			});

			function createGrammar(grammar) {
				var paramName = tryAddGrammarToConfig(grammar);
				if (paramName && cfg[paramName].enabled) {
					grammars[paramName] = SemanticolorGrammarFactory.create(grammar, cfg[paramName], cfg.colorOptions.hues);
				}
			}

			function tryAddGrammarToConfig(grammar) {
				var grammarName = getGrammarName(grammar);
				if (grammarList.includes(grammarName)) {
					return getGrammarParamNameFromGrammarName(grammarName);
				}
				if (grammar.packageName !== SemanticolorGrammarFactory.packageName &&
					grammar.scopeName.includes('source') && grammar.fileTypes.length &&
					Sugar.Array.subtract(grammar.fileTypes, ignoredFileTypes).length > 0) {
					grammarList.push(grammarName);
					writeGrammarListFile();
					console.log('added ' + grammarName, grammar);
					Semanticolor.confirmReload();
				}
			}

			this.disposables.add(atom.workspace.observeTextEditors(enable));

			var editors = atom.workspace.getTextEditors();
			for (var i = 0; i < editors.length; i++) {
				enable(editors[i]);
			}

			this.disposables.add(atom.config.onDidChange('semanticolor', function(change) {
				if (Semanticolor.deactivated) return;
				_.debounce(function() {
					Semanticolor.updateLessStylesheet(change.newValue.colorOptions.hues === change.oldValue.colorOptions.hues);
					for (var i = 0; i < grammarList.length; i++) {
						var paramName = getGrammarParamNameFromGrammarName(grammarList[i]);
						if (!Sugar.Object.isEqual(change.newValue[paramName], change.oldValue[paramName])) {
							Semanticolor.confirmReload();
							break;
						}
					}
				}, 1000)();
			}));

			function enable(editor) {
				var grammar = editor.getGrammar();
				var paramName = getGrammarParamNameFromGrammarName(getGrammarName(grammar));
				if (grammars[paramName]) {
					editor.setGrammar(grammars[paramName]);
				}
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
			var disposable = this.disposables;
			this.disposables = new CompositeDisposable();
			disposable.dispose();
			return this.semanticolorView.destroy();
		},
	};

}).call(this);
