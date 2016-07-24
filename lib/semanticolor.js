(function() {
	var Semanticolor;
	var SemanticolorView = require('./semanticolor-view');
	var CompositeDisposable = require('atom').CompositeDisposable;
	var SemanticolorGrammarFactory = require('./semanticolor-grammar');

	var $ = require('atom-space-pen-views').$;
	var _ = require('lodash');
	require('sugar');

	var fs = require('fs');
	var path = require('path');

	var lessFile = path.join(__dirname, '..', 'styles', 'semanticolor.less');

	var grammars = {};
	var ignoredGrammars = ['json', 'cson', 'gfm'];

	module.exports = Semanticolor = {
		config: {
			colorOptions: {
				description: 'Options that affect how colors are generated.',
				type: 'object',
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
			},
			editorOptions: {
				type: 'object',
				description: 'Options that affect how colors are applied.',
				properties: {
					comment: {
						type: 'string',
						title: 'Comments',
						default: 'contrast',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 1
					},
					primitive: {
						type: 'string',
						title: 'Primitives',
						default: 'mute',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 2
					},
					storage: {
						type: 'string',
						title: 'Storage keywords',
						default: 'mute',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 3
					},
					support_type: {
						type: 'string',
						title: 'Support types',
						default: 'mute',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 4
					},
					language: {
						type: 'string',
						title: 'Language elements',
						default: 'mute',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 5
					},
					keyword: {
						type: 'string',
						title: 'Keywords',
						default: 'mute',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 6
					},
					operator: {
						type: 'string',
						title: 'Operators',
						default: 'mute',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 7
					},
					punctuation: {
						type: 'string',
						title: 'Punctuation',
						default: 'mute',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 8
					},
					markup: {
						type: 'string',
						title: 'String constants',
						default: 'ignore',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 9
					},
					string: {
						type: 'string',
						title: 'String constants',
						default: 'ignore',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 10
					},
					support_constant: {
						type: 'string',
						title: 'Support constants',
						default: 'ignore',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 11
					},
					constant_numeric: {
						type: 'string',
						title: 'Numeric constants',
						default: 'ignore',
						enum: ['contrast', 'mute', 'ignore', 'colorize'],
						order: 12
					},
				}
			}
		},
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

			this.disposables.add(atom.workspace.observeTextEditors(enable));

			var editors = atom.workspace.getTextEditors();
			for (var i = 0; i < editors.length; i++) {
				enable(editors[i]);
			}

			this.disposables.add(atom.config.onDidChange('semanticolor', function(change) {
				if (Semanticolor.deactivated) return;
				_.debounce(function() {
					Semanticolor.updateLessStylesheet(change.newValue.colorOptions.hues === change.oldValue.colorOptions.hues);
					if (!Object.equal(change.newValue.editorOptions, change.oldValue.editorOptions)) {
						Semanticolor.confirmReload();
					}
				}, 1000)();
			}));

			function enable(editor) {
				var grammar = editor.getGrammar();
				if (grammar.packageName !== SemanticolorGrammarFactory.packageName &&
					grammar.scopeName.has('source') && !ignoredGrammar(grammar.scopeName)) {
					if (!grammars[grammar.scopeName]) {
						grammars[grammar.scopeName] = SemanticolorGrammarFactory.create(grammar, cfg.editorOptions,
							cfg.colorOptions.hues);
					}
					editor.setGrammar(grammars[grammar.scopeName]);
				}
			}

			function ignoredGrammar(scopeName) {
				for (var i = 0; i < ignoredGrammars.length; i++) {
					if (scopeName.has(ignoredGrammars[i])) {
						return true;
					}
				}
				return false;
			}
		},
		confirmReload: function() {
			if (this.deactivated) return;
			this.semanticolorView = new SemanticolorView();
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
