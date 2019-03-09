const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const sinon = require('sinon');

const ModuleStats = require('../src/ModuleStats');

describe('ModuleStats', () => {
  it('should throw on missing module name', () => {
    return expect(
      () => {
        new ModuleStats();
      },
      'to throw',
      'Invalid module name.'
    );
  });

  it('should throw on empty module name', () => {
    return expect(
      () => {
        new ModuleStats(' ');
      },
      'to throw',
      'Invalid module name.'
    );
  });

  it('should default to npm', () => {
    const moduleStats = new ModuleStats('somepackage');

    return expect(moduleStats, 'to satisfy', {
      fetchSource: 'npm'
    });
  });

  it('should set libraries.io in the presence of an API key', () => {
    const moduleStats = new ModuleStats('somepackage', {
      librariesIoApiKey: 'SOME_KEY'
    });

    return expect(moduleStats, 'to satisfy', {
      fetchSource: 'libraries.io'
    });
  });

  describe('#fetchDependents', () => {
    let createPackageRequestStub;

    beforeEach(() => {
      createPackageRequestStub = sinon.stub(
        ModuleStats,
        'createPackageRequest'
      );
    });

    afterEach(() => {
      createPackageRequestStub.restore();
    });

    it('should reject on unsupported fetch source', () => {
      const moduleStats = new ModuleStats('somepackage');

      moduleStats.fetchSource = 'other';

      return expect(
        () => moduleStats.fetchDependents(),
        'to be rejected with',
        'unsupported fetch source'
      );
    });

    it('should fetch and record npm dependents', () => {
      const moduleStats = new ModuleStats('sompackage');
      const fetchNpmDependentsStub = sinon.stub(
        moduleStats,
        'fetchNpmDependents'
      );
      fetchNpmDependentsStub.resolves(['foo', 'bar', 'baz']);
      createPackageRequestStub.resolves();

      return expect(moduleStats.fetchDependents(), 'to be fulfilled with', [
        'foo',
        'bar',
        'baz'
      ]).then(() => {
        expect(fetchNpmDependentsStub, 'was called');
      });
    });

    it('should fetch and record libraries.io dependents', () => {
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });
      const fetchLibrariesIoDependentsStub = sinon
        .stub(moduleStats, 'fetchLibrariesIoDependents')
        .resolves([]);

      return expect(
        moduleStats.fetchDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchLibrariesIoDependentsStub, 'was called');
      });
    });

    it('should return previously fetched dependents', () => {
      createPackageRequestStub.resolves(['foo', 'bar', 'baz']);
      const moduleStats = new ModuleStats('sompackage');
      moduleStats.dependents = ['quux'];

      return expect(moduleStats.fetchDependents(), 'to be fulfilled with', [
        'quux'
      ]).then(() => {
        expect(createPackageRequestStub, 'was not called');
      });
    });
  });

  describe('#fetchLibrariesIoDependents', () => {
    let fetchStub;

    beforeEach(() => {
      fetchStub = sinon.stub(ModuleStats, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
    });

    it('should fetch and record dependents', () => {
      fetchStub
        .onFirstCall()
        .resolves({
          json: () => [
            {
              full_name: 'someorg/somepackage',
              host_type: 'GitHub'
            }
          ]
        })
        .onSecondCall()
        .resolves({
          json: () => ({ name: 'somepackage' })
        });
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        ['somepackage']
      ).then(() => {
        expect(fetchStub, 'to have calls satisfying', [
          [
            'https://libraries.io/api/NPM/sompackage/dependent_repositories?api_key=SOME_KEY'
          ],
          [
            'https://raw.githubusercontent.com/someorg/somepackage/master/package.json'
          ]
        ]);
        expect(moduleStats.dependents, 'to equal', ['somepackage']);
      });
    });

    it('should ignore dependents not hosted on GitHub', () => {
      fetchStub.resolves({
        json: () => [
          {
            full_name: 'someorg/somepackage',
            host_type: 'FooBar'
          }
        ]
      });
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchStub, 'was called times', 1);
        expect(moduleStats.dependents, 'to equal', []);
      });
    });

    it('should ignore dependents with no name', () => {
      fetchStub
        .onFirstCall()
        .resolves({
          json: () => [
            {
              full_name: 'someorg/somepackage',
              host_type: 'GitHub'
            }
          ]
        })
        .onSecondCall()
        .resolves({
          json: () => ({})
        });
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchStub, 'was called times', 2);
        expect(moduleStats.dependents, 'to equal', []);
      });
    });

    it('should ignore dependents without package.json', () => {
      fetchStub
        .onFirstCall()
        .resolves({
          json: () => [
            {
              full_name: 'someorg/somepackage',
              host_type: 'GitHub'
            }
          ]
        })
        .onSecondCall()
        .rejects(new Error('fail'));
      const moduleStats = new ModuleStats('sompackage', {
        librariesIoApiKey: 'SOME_KEY'
      });

      return expect(
        moduleStats.fetchLibrariesIoDependents(),
        'to be fulfilled with',
        []
      ).then(() => {
        expect(fetchStub, 'was called times', 2);
        expect(moduleStats.dependents, 'to equal', []);
      });
    });
  });

  describe('#fetchNpmDependents', () => {
    let createPackageRequestStub;

    beforeEach(() => {
      createPackageRequestStub = sinon.stub(
        ModuleStats,
        'createPackageRequest'
      );
    });

    afterEach(() => {
      createPackageRequestStub.restore();
    });

    it('should fetch and record dependents', () => {
      createPackageRequestStub.resolves(['foo', 'bar', 'baz']);
      const moduleStats = new ModuleStats('sompackage');

      return expect(moduleStats.fetchNpmDependents(), 'to be fulfilled with', [
        'foo',
        'bar',
        'baz'
      ]).then(() => {
        expect(moduleStats.dependents, 'to equal', ['foo', 'bar', 'baz']);
      });
    });
  });

  describe('#fetchInfo', () => {
    let createPackageRequestStub;

    beforeEach(() => {
      createPackageRequestStub = sinon.stub(
        ModuleStats,
        'createPackageRequest'
      );
    });

    afterEach(() => {
      createPackageRequestStub.restore();
    });

    it('should fetch and record package.json', () => {
      const result = { name: 'fugl', foo: 'bar' };
      createPackageRequestStub.resolves(result);
      const moduleStats = new ModuleStats('fugl');

      return expect(
        moduleStats.fetchInfo(),
        'to be fulfilled with',
        result
      ).then(() => {
        expect(moduleStats.packageJson, 'to equal', result);
      });
    });

    it('should return previously fetched package.json', () => {
      createPackageRequestStub.resolves({ name: 'fugl', foo: 'baz' });
      const moduleStats = new ModuleStats('fugl');
      const result = { name: 'fugl', foo: 'bar' };
      moduleStats.packageJson = result;

      return expect(
        moduleStats.fetchInfo(),
        'to be fulfilled with',
        result
      ).then(() => {
        expect(createPackageRequestStub, 'was not called');
      });
    });
  });

  describe('ModuleStats.createPackageRequest', () => {
    function createFakeRegistry() {
      const moduleNamespace = {
        dependents: sinon.stub().named('dependents'),
        downloads: sinon.stub().named('downloads')
      };

      return [
        {
          module: sinon
            .stub()
            .named('module')
            .returns(moduleNamespace)
        },
        moduleNamespace
      ];
    }

    it('should reject on request error', () => {
      const [registry, moduleNamespace] = createFakeRegistry();

      moduleNamespace.dependents.callsArgWith(0, new Error('failure'));

      return expect(
        () =>
          ModuleStats.createPackageRequest('somepackage', 'dependents', {
            _registry: registry
          }),
        'to be rejected with',
        'failure'
      );
    });

    describe('ModuleStats.createRepositoryRequest', () => {
      let fetchStub;

      beforeEach(() => {
        fetchStub = sinon.stub(ModuleStats, 'fetch');
      });

      afterEach(() => {
        fetchStub.restore();
      });

      it('should reject on request error', () => {
        fetchStub.rejects(new Error('failure'));

        return expect(
          () =>
            ModuleStats.createRepositoryRequest(
              'https://github.com/org/somepackage.git'
            ),
          'to be rejected with',
          'Error fetching repository for https://github.com/org/somepackage.git'
        ).then(() => {
          expect(fetchStub, 'to have a call satisfying', [
            'https://api.github.com/repos/org/somepackage',
            { headers: { Accept: 'application/vnd.github.v3+json' } }
          ]);
        });
      });

      it('should resolve with repository info', () => {
        fetchStub.resolves({
          json: () => ({ stargazers_count: 45 })
        });

        return expect(
          () =>
            ModuleStats.createRepositoryRequest(
              'https://github.com/org/somepackage.git'
            ),
          'to be fulfilled with',
          { stargazers_count: 45 }
        );
      });
    });
  });

  describe('ModuleStats.packageNamesByMagnitude', () => {
    it('should return an ordered set of package names', () => {
      return expect(
        ModuleStats.packageNamesByMagnitude({
          foo: 3,
          bar: 2,
          baz: 4
        }),
        'to equal',
        ['baz', 'foo', 'bar']
      );
    });
  });
});
