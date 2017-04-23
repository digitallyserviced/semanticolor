module.exports = {
	env: {
		browser: true,
		commonjs: true,
		node: true,
		es6: true
	},
	globals: {
		atom: false
	},
	extends: 'eslint:recommended',
	parserOptions: {
		sourceType: 'module'
	},
	rules: {
		indent: ['error', 'tab', {
			SwitchCase: 1
		}],
		'linebreak-style': ['error', 'unix'],
		quotes: ['error', 'single'],
		semi: ['error', 'always'],
		'object-curly-spacing': ['error', 'always'],
		'key-spacing': ['error', {
			singleLine: { mode: 'strict' },
			multiLine: { mode: 'minimum' }
		}],
		'object-curly-newline': 'error',
		'object-property-newline': 'error',
		'array-bracket-spacing': ['error', 'never'],
		'computed-property-spacing': ['error', 'never'],
		'keyword-spacing': 'error',
		'space-infix-ops': 'error',
		'space-unary-ops': ['error', { words: true, nonwords: false }],
		'space-before-function-paren': ['error', {
			anonymous: 'always',
			named: 'never',
			asyncArrow: 'always'
		}],
		'newline-per-chained-call': 'error',
		'one-var': ['error', 'never'],
		'quote-props': ['error', 'as-needed', { keywords: true, numbers: true }],
		curly: 'error',
		'no-trailing-spaces': ['error', {skipBlankLines: true}],
		'no-whitespace-before-property': 'error',
		'comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'never',
        exports: 'never',
        functions: 'never',
    }],
		'arrow-body-style': ['error', 'as-needed', { requireReturnForObjectLiteral: true }],
		'arrow-parens': ['error', 'as-needed'],
		'arrow-spacing': 'error',
	}
}
