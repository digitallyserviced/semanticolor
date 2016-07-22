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
  var enabledSourceObjects = ['variable', 'function', 'function-call'];
  var excludeSourceSelector = "comment";
  var updatedCd = null;

  var grammars = {};

  module.exports = Semanticolor = {
    config: {
      colors: {
        type: 'integer',
        description: 'Higher number will allow for more unique tokens and colors. Lower will limit the colors used.',
        minimum: 8,
        default: 360,
        maximum: 720,
        order: 1
      },
      saturation: {
        type: 'number',
        description: 'Color stauration (0 to 100%).',
        minimum: 0.1,
        default: 90,
        maximum: 100,
        order: 2
      },
      luminosity: {
        type: 'number',
        description: 'Color luminosity (0 to 100%).',
        minimum: 0.1,
        default: 50,
        maximum: 100,
        order: 3
      },
      fade: {
        type: 'number',
        description: 'Color fade (0 to 100%).',
        minimum: 0.1,
        default: 50,
        maximum: 100,
        order: 4
      }
    },
    semanticolorView: SemanticolorView,
    modalPanel: SemanticolorView,
    selector: '.source',
    disableForSelector: '',
    disposables: new CompositeDisposable(),
    updateLessStylesheet: function(skipReload) {
      var cfg = atom.config.get('semanticolor');
      var less = makeLess(cfg.colors, cfg.saturation, cfg.luminosity, cfg.fade);
      var written = false;
      try {
        var currentLess = fs.readFileSync(lessFile, { encoding: 'utf-8' });
        if (currentLess !== less) {
          fs.writeFileSync(lessFile, less, { encoding: 'utf-8' });
          written = true;
        }
        if (written) {
          atom.notifications.addSuccess('Rewrote new colors...', {
            detail: 'Reloading with stylesheet of ' + cfg.colors + ' possible colors.'
          });
          if (!skipReload) {
            this.confirmReload();
          }
        }
      } catch (e) {
        atom.notifications.addError('No initial colors configured...', {
          detail: 'Updating stylesheet with default of ' + this.config.colors.default+
            ' possible colors.'
        });
        try {
          less = makeLess(this.config.colors.default, this.config.saturation.default,
            this.config.luminosity.default, this.config.fade.default);
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
        return '@colors: ' + hues + ';\n' +
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

      this.disposables.add(atom.workspace.observeTextEditors(function(editor) {
        var grammar = editor.getGrammar();
        if (grammar.packageName !== SemanticolorGrammarFactory.packageName &&
          !grammar.scopeName.has('null-grammar')) {
          if (!grammars[grammar.scopeName]) {
            grammars[grammar.scopeName] = SemanticolorGrammarFactory.create(grammar, enabledSourceObjects,
              cfg.colors);
          }
          editor.setGrammar(grammars[grammar.scopeName]);
        }

        Semanticolor.disposables.add(atom.config.onDidChange('semanticolor', function(change) {
          if (Semanticolor.deactivated) return;
          _.debounce(function() {
            Semanticolor.updateLessStylesheet(change.newValue.colors === change.oldValue.colors);
          }, 1000)();
        }));
      }));
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
    serialize: function() {
      return {
        semanticolorViewState: this.semanticolorView.serialize()
      };
    }
  };

}).call(this);
