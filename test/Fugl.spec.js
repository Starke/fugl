const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));
const EventEmitter = require('events');
const path = require('path');
const rimraf = require('rimraf');
const sinon = require('sinon');

const Fugl = require('../src/Fugl');

describe('Fugl', () => {
  beforeEach(() => {
    rimraf.sync(path.join(__dirname, 'scratch', 'builds'));
  });

  it('should default options', () => {
    const fugl = new Fugl({});
    const baseDir = path.resolve(__dirname, '..');

    return expect(fugl.options, 'to equal', {
      reporter: 'console',
      folder: baseDir,
      noClean: false,
      pretest: true,
      reportDir: path.join(baseDir, 'breakage'),
      tmpDir: path.join(baseDir, 'builds'),
      packageName: 'dont-break',
      packageVersion: 'latest'
    });
  });

  it('should return stats on a pass', () => {
    const fugl = new Fugl({ dep: ['FOO'], reporter: 'none' });
    const testDependentStub = sinon
      .stub(fugl, 'testDependent')
      .callsFake(emitter => {
        emitter.emit('pass', { title: 'FOO' });

        return Promise.resolve();
      });

    return expect(() => fugl.run(), 'to be fulfilled with', {
      passes: 1,
      failures: 0
    }).then(() => {
      expect(testDependentStub, 'was called');
    });
  });

  it('should return stats on a fail', () => {
    const fugl = new Fugl({ dep: ['FOO'], reporter: 'none' });
    const testDependentStub = sinon
      .stub(fugl, 'testDependent')
      .callsFake(emitter => {
        emitter.emit('fail', { title: 'FOO' }, new Error('failure'));

        return Promise.resolve();
      });

    return expect(() => fugl.run(), 'to be fulfilled with', {
      passes: 0,
      failures: 1
    }).then(() => {
      expect(testDependentStub, 'was called');
    });
  });

  describe('with multiple dependents', () => {
    it('should return stats on a pass', () => {
      const fugl = new Fugl({ dep: ['FOO', 'BAR', 'BAZ'], reporter: 'none' });
      let testDependentCallCount = 0;
      const testDependentStub = sinon
        .stub(fugl, 'testDependent')
        .callsFake(emitter => {
          testDependentCallCount += 1;

          switch (testDependentCallCount) {
            case 1:
              emitter.emit('pass', { title: 'FOO' });
              break;
            case 2:
              emitter.emit('fail', { title: 'BAR' }, new Error('failure'));
              break;
            case 3:
              emitter.emit('pass', { title: 'BAZ' });
              break;
          }

          return Promise.resolve();
        });

      return expect(() => fugl.run(), 'to be fulfilled with', {
        passes: 2,
        failures: 1
      }).then(() => {
        expect(testDependentStub, 'to have calls satisfying', [
          [
            expect.it('to be a', EventEmitter),
            {},
            { name: 'FOO', pretest: true }
          ],
          [
            expect.it('to be a', EventEmitter),
            {},
            { name: 'BAR', pretest: true }
          ],
          [
            expect.it('to be a', EventEmitter),
            {},
            { name: 'BAZ', pretest: true }
          ]
        ]);
      });
    });
  });
});
