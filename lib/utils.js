module.exports = {
	isTreeSitter: function (grammar) {
		return grammar.constructor.name === 'TreeSitterGrammar';
	},
};
