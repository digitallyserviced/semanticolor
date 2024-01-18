describe('semanticolor', () => {
	var editor;

	beforeEach(async () => {
		await atom.packages.activatePackage('language-javascript');
		editor = await atom.workspace.open('foo.js');
		editor.setText('let foo = 1;');
	});

	beforeEach(function () {
		this.addMatchers({
			toInclude(scope) {
				if (!Array.isArray(this.actual)) {
					this.message = () => 'Scopes are not an array';
					return false;
				}

				if (this.actual.length === 0) {
					this.message = () => 'No scopes revcieved';
					return false;
				}

				if (this.actual.some((s) => s.match(scope))) {
					return true;
				}

				this.message = () =>
					`No scope matched '${scope}'. Recieved: ${this.actual.join(', ')}`;
				return false;
			},
		});
	});

	describe('textmate grammars', () => {
		beforeEach(async () => {
			atom.config.set('core.useTreeSitterParsers', false);
			atom.config.set('core.useLegacyTreeSitter', false);

			await atom.packages.activatePackage('semanticolor');
		});

		it('adds a semanticolor grammar', () => {
			grammar = atom.grammars.grammarForScopeName("source.js");
			expect(grammar).toBeTruthy();
			expect(grammar.scopeName).toBe("source.js");
			expect(grammar.constructor.name).toBe("Grammar");
			expect(grammar.packageName).toBe("semanticolor");
		})

		it('adds semanticolor scopes to buffer', () => {
			expect(editor?.languageMode?.grammar?.constructor?.name).toBe(
				'Grammar',
			);
			const scopes = editor
				.scopeDescriptorForBufferPosition([0, 4])
				.getScopesArray();
			expect(scopes).toInclude('identifier.semanticolor');
		});
	});

	describe('legacy tree-sitter grammars', () => {
		beforeEach(async () => {
			atom.config.set('core.useTreeSitterParsers', true);
			atom.config.set('core.useLegacyTreeSitter', true);

			await atom.packages.activatePackage('semanticolor');
		});

		it('adds a semanticolor grammar', () => {
			grammar = atom.grammars.grammarForScopeName("source.js");
			expect(grammar).toBeTruthy();
			expect(grammar.scopeName).toBe("source.js");
			expect(grammar.constructor.name).toBe("TreeSitterGrammar");
			expect(grammar.packageName).toBe("semanticolor");
		})

		it('adds semanticolor scopes to buffer', () => {
			expect(editor?.languageMode?.grammar?.constructor?.name).toBe(
				'TreeSitterGrammar',
			);
			const scopes = editor
				.scopeDescriptorForBufferPosition([0, 4])
				.getScopesArray();
			expect(scopes).toInclude('identifier.semanticolor');
		});
	});
});
