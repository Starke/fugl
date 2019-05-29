const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const path = require('path');
const sinon = require('sinon');

const testDependent = require('../src/test-dependent');

function createFakePackageInstaller() {
  return {
    installTo: sinon.stub().named('installTo')
  };
}

describe('testDependent', () => {
  const toFolder = path.join(__dirname, 'scratch', 'foo');

  it('should resolve with a test result structure', () => {
    const packageInstaller = createFakePackageInstaller();
    packageInstaller.installTo.resolves();
    const testInFolderSpy = sinon.stub().resolves();

    return expect(
      testDependent(
        {
          _testInFolder: testInFolderSpy,
          packageInstaller,
          moduleName: 'https://github.com/bahmutov/dont-break-bar',
          toFolder: toFolder
        },
        {
          pretest: true,
          projects: [{ name: 'FOO' }],
          name: 'FOO'
        }
      ),
      'to be fulfilled with',
      expect.it('to equal', {
        pretest: { status: 'pass' },
        packagetest: { status: 'pass' }
      })
    );
  });

  it('should resolve with a package test failure', () => {
    const packageInstaller = createFakePackageInstaller();
    packageInstaller.installTo.resolves();
    const packageTestError = new Error('failure');
    const testInFolderSpy = sinon
      .stub()
      .onFirstCall()
      .resolves()
      .onSecondCall()
      .rejects(packageTestError);

    return expect(
      testDependent(
        {
          _testInFolder: testInFolderSpy,
          packageInstaller,
          moduleName: 'https://github.com/bahmutov/dont-break-bar',
          toFolder: toFolder
        },
        {
          pretest: true,
          projects: [{ name: 'FOO' }],
          name: 'FOO'
        }
      ),
      'to be fulfilled with',
      expect.it('to equal', {
        pretest: { status: 'pass' },
        packagetest: { status: 'fail', error: packageTestError }
      })
    );
  });

  it('should trigger tests of the dependent', () => {
    const packageInstaller = createFakePackageInstaller();
    packageInstaller.installTo.resolves();
    const testInFolderSpy = sinon.stub().resolves();

    return expect(
      testDependent(
        {
          _testInFolder: testInFolderSpy,
          packageInstaller,
          moduleName: 'https://github.com/bahmutov/dont-break-bar',
          toFolder: toFolder
        },
        {
          pretest: true,
          projects: [{ name: 'FOO' }],
          name: 'FOO'
        }
      ),
      'to be fulfilled'
    ).then(() => {
      expect(testInFolderSpy, 'was called times', 2).and(
        'to have all calls satisfying',
        [toFolder, 'npm test']
      );
    });
  });

  it('should trigger installing the package in the dependent', () => {
    const packageInstaller = createFakePackageInstaller();
    packageInstaller.installTo.resolves();
    const testInFolderSpy = sinon.stub().resolves();

    return expect(
      testDependent(
        {
          _testInFolder: testInFolderSpy,
          packageInstaller,
          moduleName: 'https://github.com/bahmutov/dont-break-bar',
          toFolder: toFolder
        },
        {
          pretest: true,
          projects: [{ name: 'FOO' }],
          name: 'FOO'
        }
      ),
      'to be fulfilled'
    ).then(() => {
      expect(packageInstaller.installTo, 'was called times', 1).and(
        'to have a call exhaustively satisfying',
        [
          { toFolder },
          { pretest: true, name: 'FOO', projects: [{ name: 'FOO' }] }
        ]
      );
    });
  });

  describe('when operating with pretest', () => {
    it('should return pending if pretestOrIgnore', () => {
      const packageInstaller = createFakePackageInstaller();
      packageInstaller.installTo.resolves();
      const preTestError = new Error('failure');
      const testInFolderSpy = sinon.stub().rejects(preTestError);

      return expect(
        testDependent(
          {
            _testInFolder: testInFolderSpy,
            packageInstaller,
            moduleName: 'https://github.com/bahmutov/dont-break-bar',
            toFolder: toFolder,
            pretestOrIgnore: true
          },
          {
            pretest: true,
            projects: [{ name: 'FOO' }],
            name: 'FOO'
          }
        ),
        'to be fulfilled with',
        expect.it('to equal', {
          pretest: { status: 'pending' }
        })
      );
    });
  });

  describe('when operating without pretest', () => {
    it('should return test result structure', () => {
      const packageInstaller = createFakePackageInstaller();
      packageInstaller.installTo.resolves();
      const testInFolderSpy = sinon.stub().resolves();

      return expect(
        testDependent(
          {
            _testInFolder: testInFolderSpy,
            packageInstaller,
            moduleName: 'https://github.com/bahmutov/dont-break-bar',
            toFolder: toFolder
          },
          {
            pretest: false,
            projects: [{ name: 'FOO' }],
            name: 'FOO'
          }
        ),
        'to be fulfilled with',
        expect.it('to equal', {
          packagetest: { status: 'pass' }
        })
      );
    });
  });

  describe('with aftertest hook', () => {
    it('should execute an aftertest command', () => {
      const packageInstaller = createFakePackageInstaller();
      packageInstaller.installTo.resolves();
      const testInFolderSpy = sinon.stub().resolves();

      return expect(
        testDependent(
          {
            _testInFolder: testInFolderSpy,
            packageInstaller,
            moduleName: 'https://github.com/bahmutov/dont-break-bar',
            toFolder: toFolder
          },
          {
            pretest: true,
            projects: [{ name: 'FOO' }],
            name: 'FOO',
            aftertest: 'some_command'
          }
        ),
        'to be fulfilled'
      ).then(() => {
        expect(testInFolderSpy, 'was called times', 3).and(
          'to have calls satisfying',
          [
            [toFolder, 'npm test'],
            [toFolder, 'npm test'],
            [toFolder, 'some_command']
          ]
        );
      });
    });
  });
});
