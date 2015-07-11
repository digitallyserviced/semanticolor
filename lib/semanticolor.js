(function() {
  var Semanticolor, SemanticolorView, CompositeDisposable;

  SemanticolorView = require('./semanticolor-view');

  CompositeDisposable = require('atom').CompositeDisposable;

  var $ = require("atom-space-pen-views").$;
  var _ = require('lodash');

  var fs = require('fs');
  var path = require('path');

  var thisDir = path.dirname(__dirname);
  var lessFile = thisDir + '/styles/semanticolor.less';

  function hash(string) {
    return string.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    var chr, hash, i, len;
    hash = 0;
    if (string.length === 0) {
      return hash;
    }
    i = 0;
    len = string.length;
    while (i < len) {
      chr = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
      i++;
    }
    return hash;
  }

  function colorIndex(string) {
    return (Math.abs(hash(string)) % colorDiversity) + 1;
  }

  var enabledGrammars = ".php";
  var enabledSourceObjects = ".variable, .function, .function-call";
  var colorDiversity = 96;
  var excludeSourceSelector = ".comment";
  var updatedCd = null;

  var affectedSourceSelector = ".variable, .function, .function-call, .entity, .class";
  module.exports = Semanticolor = {
    config: {
  		/*affectedGrammars: {
  			type: 'object',
  			properties: {
          enablePHP: {
            title: 'PHP Enabled',
            description: "Enable the PHP source selector \'.php\'",
            type: 'boolean',
            value: '.php',
            default: true
          },
          enableJavaScript: {
            title: 'JavaScript Enabled',
            description: "Enable the PHP source selector \'.js\' (Since Atom does not parse JS proper you need the language-javascript-semantic package)",
            type: 'boolean',
            value: '.js',
            default: true
          },
          enablePython: {
            title: 'Python Enabled',
            description: "Enable the PHP source selector \'.python\'",
            type: 'boolean',
            value: '.python',
            default: true
          },
          enableCoffeeScript: {
            title: 'CoffeeScript Enabled',
            description: "Enable the CoffeeScript source selector \'.coffee\'",
            type: 'boolean',
            value: '.coffee',
            default: true
          },
          enableHTML: {
            title: 'HTML Enabled',
            description: "Enable the HTML source selector \'.html\'",
            type: 'boolean',
            value: '.html',
            default: true
          },
          additionalGrammarSelectors: {
            title: 'Define additional Grammars by their selector',
            description: "Usually along the lines of \'.somelanguage\'",
            type: 'string',
            default: ''
          }
        }
  		},*/
      affectedSourceObjects: {
        title: 'Source objects to colorize',
        description: "What grammars you want to colorize. All objects of the same name are colored the same throughout",
  			type: 'object',
  			properties: {
          enableVariables: {
            title: 'Variables Enabled',
            description: "Enable variable selector \'.variable\'",
            type: 'boolean',
            default: true,
            value: '.variable'
          },
          enableFunctions: {
            title: 'Functions Enabled',
            description: "Enable function selector \'.function\'",
            type: 'boolean',
            default: true,
            value: '.function'
          },
          enableFunctionCalls: {
            title: 'Function Calls Enabled',
            description: "Enable function calls selector \'.function-call\'",
            type: 'boolean',
            default: true,
            value: '.function-call'
          },
          enableEntities: {
            title: 'Class Entities',
            description: "Enable entity selector \'.entity\'",
            type: 'boolean',
            default: true,
            value: '.entity'
          },
          enableClasses: {
            title: 'Class Names',
            description: "Enable class selector \'.class\'",
            type: 'boolean',
            default: true,
            value: '.class'
          },
          enableConstants: {
            title: 'Constants',
            description: "Enable constants selector \'.constant\'",
            type: 'boolean',
            default: true,
            value: '.constant'
          },
          enableHtmlTags: {
            title: 'HTML Tags',
            description: "Enable function selector \'.block\'",
            type: 'boolean',
            default: true,
            value: '.block'
          },
          additionalSelectors: {
            title: 'Define additional selectors for colorizing. All similar innerTexts are the same color.',
            description: "Usually along the lines of \'.comment, .example\'. Must be comma delimited!",
            type: 'string',
            default: ''
          }
        }
  		},
  		/*affectedSourceSelector: {
  			type: 'string',
  			'default': ".variable, .function, .function-call, .entity, .class, .block.html"
  		},*/
  		excludeSourceSelector: {
  			type: 'string',
  			'default': '.comment'
  		},
      colorDiversity: {
        type: 'integer',
        text: 'Affects how diverse the colors are.',
        description: 'Higher number will allow for more unique tokens and colors. Lower will limit the colors used.',
        minimum: 8,
        default: 96,
        maximum: 360
      }
  	},
    semanticolorView: SemanticolorView,
    modalPanel: SemanticolorView,
    selector: '.source',
    disableForSelector: '',
    subscriptions: null,
    updateColors: function(loc){
      loc.find(enabledSourceObjects).each(function(i, el) {
        if ($(el).is(excludeSourceSelector)) return;
        /*if (!$(el).is(enabledGrammars)) return;*/
        var text = el.innerText;
        var semanticClass = "identifier semanticolor-" + colorIndex(text);
        $(el).addClass(semanticClass);
      });
    },
    updateLESSStylesheet: function(){
      var cd = atom.config.get('semanticolor').colorDiversity;
      var lessUpdate = "@colorDiversity: " + cd + ';';
      var written = false;
      try {
        var currentLess = fs.readFileSync(lessFile);
        if (currentLess != lessUpdate){
          fs.writeFileSync(lessFile, lessUpdate);
        }
        atom.notifications.addSuccess('Rewrote new colorDiversity...',{detail: 'Reloading with stylesheet of {'+colorDiversity+'} possible colors.'});
        this.confirmReload();
      } catch(e) {
        if (e.code === 'ENOENT') {
            atom.notifications.addError('No initial colorDiversity configured...',{detail: 'Updating stylesheet with default of {'+colorDiversity+'} possible colors.'});
            try {
              var lessUpdate = "@colorDiversity: " + 96 + ';';
              written = fs.writeFileSync(lessFile, lessUpdate);
            } catch(err) {
              console.log(err);
              atom.notifications.addError(e.code + ' : ' + e.message, {detail: 'Something failed not sure what. Open an issue with me!'});
            }
          } else {
            atom.notifications.addError('No initial colorDiversity configured...',{detail: 'Updating stylesheet with default of {'+colorDiversity+'} possible colors.'});
          }
      } finally {

      }
    },
    updateConfigRuntime: function(updateStylesheet){
      var config = atom.config.get('semanticolor');

      /*var enableGrammarsArray = [];
      _.each(Semanticolor.config.affectedGrammars.properties, function(v, i){
        var status = v.default;

        if (config.affectedGrammars[i] !== undefined){
          status = config.affectedGrammars[i];
        }

        if (status){
          enableGrammarsArray.push(v.value);
        }
      });

      enabledGrammars = enableGrammarsArray.join(", ");
*/
      var enableObjectsArray = [];

      _.each(Semanticolor.config.affectedSourceObjects.properties, function(v, i){
        var status = v.default;

        if (config.affectedSourceObjects[i] !== undefined){
          status = config.affectedSourceObjects[i];
        }

        if (status && v.type == 'boolean'){
          enableObjectsArray.push(v.value);
        }
      });

      enabledSourceObjects = enableObjectsArray.join(", ");

      if (config['colorDiversity']){
        colorDiversity = config['colorDiversity'];
      }

      if (updateStylesheet)
        this.updateLESSStylesheet(colorDiversity);

      return true;
    },
    activate: function(state) {
      this.updateConfigRuntime();

      return atom.workspace.observeTextEditors(function(editor) {

        var _editor;
        _editor = editor;

        var shadow, view;

        view = $(atom.views.getView(_editor));
        shadow = $(view[0].shadowRoot);

        var _this = this;
        if (this.deactivated) return;
        var colorBounce = _.debounce(function(){
          if (this.deactivated) return;
          atom.packages.getActivePackage('semanticolor').mainModule.updateColors(shadow.find('.line'));
        }.bind(this), 10);

        atom.config.onDidChange('semanticolor', function(nv, ov){
          if (this.deactivated) return;
          _.debounce(function(){
              atom.packages.getActivePackage('semanticolor').mainModule.updateConfigRuntime(true);
          }, 1000)();
        });

        editor.onDidChangeScrollTop(function(){
          colorBounce.call(_this);
        });
        editor.onDidStopChanging(function(){
          colorBounce.call(_this);
        });
        editor.onDidChangeCursorPosition(function(positions){
          colorBounce.call(_this);
        });
        return editor.onDidChange(function() {
          colorBounce.call(_this);
        });
      });
    },
    running: false,
    confirmReload: function(){
      if (this.running) return;
      this.running = true;
      this.semanticolorView = new SemanticolorView();
      this.modalPanel = atom.workspace.addModalPanel({
        item: this.semanticolorView.getElement(),
        visible: true
      });
    },
    deactivate: function() {
      this.deactivated = true;
      this.modalPanel.destroy();
      this.subscriptions.dispose();
      return this.semanticolorView.destroy();
    },
    toggle: function(){
      this.confirmReload();
    },
    serialize: function() {
      return {
        semanticolorViewState: this.semanticolorView.serialize()
      };
    }
  };

}).call(this);
