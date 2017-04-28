## 3.5.4 - fix error when first installing a new language

## 3.5.3 - fix enabling grammars as they are created

## 3.5.2 - another fix for issue adding new grammars to config

## 3.5.1 - fix issue with adding new grammars to config

## 3.5.0 - add default settings, remove annoying need to reload Atom
* add Dockerfile and json to blacklist

## 3.4.10 - fix different colors for same string

## 3.4.9 - adjust identifier characters

## 3.4.8 - fix typo in settings

## 3.4.7 - fix a potential crash bug

## 3.4.6 - better solution for intermittent loading issue

## 3.4.5 - backcompat Atom < 1.13.0, support Vue.js components
* re-add support for Atom < 1.13.0, especially useful on platforms where 1.13.0 is not yet available
* force support for Vue.js components

## 3.4.4 - Atom 1.13.0 compatibility, take 2
* Atom 1.13.0 compatibility

## 3.4.3 - Atom 1.13.0 compatibility, fix intermittent loading issue
* fix issue where semanticolor would sometimes not take effect on window load
* Atom 1.13.0 compatibility

## 3.4.2 - fix intermittent issue
* fix issue where semanticolor would sometimes not take effect on window load

## 3.4.1 - disable diff format
* disable diff again; changes to git-plus will make semanticolor work in diffs anyway

## 3.4.0 - redesigned option selection
* support for colorizing variables in ES6 template strings
* should be less likely to lose settings from previous versions
* the way the color option for a given token is chosen is now based on the scope highest on the stack, rather than specific color options always taking precedence over others
* added the 'defer' option to defer to other scopes for option selection (for some grammars you might want to do something specific while for others you don't; this lets you do that)

## 3.3.0 - enable diff format
* use version 5.17.1 or better of the git-plus package for best results

## 3.2.1 - bugfixes

## 3.2.0 - improvements all around
* miscellaneous bug fixes and improvements
* support added for HTML, XML, JSON, and other grammars
* more options for how to apply colors
