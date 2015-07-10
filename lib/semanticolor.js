(function() {
  var Semanticolor, SemanticolorView, CompositeDisposable;

  SemanticolorView = require('./semanticolor-view');

  CompositeDisposable = require('atom').CompositeDisposable;
  /*var $;*/

  var $ = require("atom-space-pen-views").$;
  var _ = require('lodash');

  var fs = require('fs');

  function hash(string) {
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

  var enabledGrammers = ".php";
  var enabledSourceObjects = ".variable, .function, .function-call";
  var colorDiversity = 96;
  var excludeSourceSelector = ".comment";

  function updateColors(loc){
    loc.find(enabledSourceObjects).each(function(i, el) {
      if ($(el).is(excludeSourceSelector)) return;
      var text = el.innerText;
      var semanticClass = "identifier semanticolor-" + colorIndex(text);
      $(el).addClass(semanticClass);
    });
  }

  function updateConfigRuntime(_this){
    var config = atom.config.get('semanticolor');

    var enableGrammarsArray = [];
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

    return true;
  }

  var affectedSourceSelector = ".variable, .function, .function-call, .entity, .class";
  module.exports = Semanticolor = {
    config: {
  		affectedGrammars: {
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
            title: 'PHP Enabled',
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
  		},
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
  		affectedSourceSelector: {
  			type: 'string',
  			'default': ".variable, .function, .function-call, .entity, .class, .block.html"
  		},
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
        maximum: 180
      }
  	},
    semanticolorView: null,
    modalPanel: null,
    selector: '.source',
    disableForSelector: '',
    subscriptions: null,
    activate: function(state) {
      updateConfigRuntime();

      return atom.workspace.observeTextEditors(function(editor) {

        var _editor;
        _editor = editor;

        var shadow, view;

        view = $(atom.views.getView(_editor));
        shadow = $(view[0].shadowRoot);

        var colorBounce = _.debounce(function(){
          updateColors(shadow.find('.line'));
        }, 10);

        atom.config.observe('semanticolor', function(){
          updateConfigRuntime(this);
          colorBounce();
        });

        editor.onDidChangeScrollTop(function(){
          colorBounce();
        });
        editor.onDidStopChanging(function(){
          colorBounce();
        });
        editor.onDidChangeCursorPosition(function(positions){
          colorBounce();
        });
        return editor.onDidChange(function() {
          colorBounce();
        });
      });
    },
    deactivate: function() {
      this.modalPanel.destroy();
      this.subscriptions.dispose();
      return this.semanticolorView.destroy();
    },
    serialize: function() {
      return {
        semanticolorViewState: this.semanticolorView.serialize()
      };
    }
  };

}).call(this);
