import { test } from '@oclif/test';
import * as chai from 'chai';
import * as path from 'path';
import Compare from '../../src/commands/compare';
import { tmpDir } from '../setup';
import { defaultFlagArgs } from '../../src/helpers/default-flag-args';

const fidelity = 'test';
const tbResultsFile = path.join(`${process.cwd()}/${tmpDir}`);
const emulateDevice = 'iphone-4';

const app = {
  control: `file://${path.join(
    process.cwd() + '/test/fixtures/release/index.html'
  )}`,
  experiment: `file://${path.join(
    process.cwd() + '/test/fixtures/experiment/index.html'
  )}`,
  regression: `file://${path.join(
    process.cwd() + '/test/fixtures/regression/index.html'
  )}`,
};

describe('compare: fixture: A/A', () => {
  test
    .stdout()
    .it(
      `runs compare --controlURL ${app.control +
        defaultFlagArgs.tracingLocationSearch} --experimentURL ${app.control +
        defaultFlagArgs.tracingLocationSearch} --fidelity ${fidelity} --tbResultsFile ${tbResultsFile}`,
      async ctx => {
        await Compare.run([
          '--controlURL',
          app.control,
          '--experimentURL',
          app.control,
          '--fidelity',
          fidelity,
          '--tbResultsFile',
          tbResultsFile,
        ]);

        chai.expect(ctx.stdout).to.contain(`Success`);
      }
    );
});

describe('compare regression: fixture: A/B', () => {
  test
    .stdout()
    .it(
      `runs compare --controlURL ${app.control +
        defaultFlagArgs.tracingLocationSearch} --experimentURL ${app.regression +
        defaultFlagArgs.tracingLocationSearch} --fidelity low --tbResultsFile ${tbResultsFile}`,
      async ctx => {
        await Compare.run([
          '--controlURL',
          app.control,
          '--experimentURL',
          app.experiment,
          '--fidelity=low',
          '--tbResultsFile',
          tbResultsFile,
        ]);

        chai
          .expect(ctx.stdout)
          .to.contain(`Statistically significant results were found`);
      }
    );
});

describe('compare mobile: fixture: A/A', () => {
  test
    .stdout()
    .it(
      `runs compare --controlURL ${app.control +
        defaultFlagArgs.tracingLocationSearch} --experimentURL ${app.experiment +
        defaultFlagArgs.tracingLocationSearch} --fidelity ${fidelity} --tbResultsFile ${tbResultsFile} --emulateDevice ${emulateDevice} `,
      async ctx => {
        await Compare.run([
          '--controlURL',
          app.control,
          '--experimentURL',
          app.experiment,
          '--fidelity',
          fidelity,
          '--tbResultsFile',
          tbResultsFile,
          '--emulateDevice',
          emulateDevice,
        ]);

        chai.expect(ctx.stdout).to.contain(`Success`);
      }
    );
});
