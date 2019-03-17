import * as fs from 'fs-extra';
import * as Table from 'cli-table2';
import * as jsonQuery from 'json-query';

import { StatDisplay } from '../stats';
import { fidelityLookup } from '../flags';
import chalk from 'chalk';
import { Command } from '@oclif/command';
import { InitialRenderBenchmark, Runner } from 'tracerbench';
import {
  browserArgs,
  control,
  cpuThrottleRate,
  experiment,
  fidelity,
  markers,
  network,
  output,
  url
} from '../flags';

const displayedStats: StatDisplay[] = [];

const cHead = chalk.rgb(255, 255, 255);
const cRegress = chalk.rgb(239, 100, 107);
const cNeutral = chalk.rgb(165, 173, 186);
const cImprv = chalk.rgb(135, 197, 113);
const cPhase = chalk.rgb(165, 173, 186);

export default class Compare extends Command {
  public static description =
    'Compare the performance delta between an experiment and control';
  public static flags = {
    browserArgs: browserArgs({ required: true }),
    control: control(),
    cpuThrottleRate: cpuThrottleRate({ required: true }),
    experiment: experiment(),
    fidelity: fidelity({ required: true }),
    markers: markers({ required: true }),
    network: network(),
    output: output({ required: true }),
    url: url({ required: true })
  };

  public async run() {
    const { flags } = this.parse(Compare);
    const {
      browserArgs,
      cpuThrottleRate,
      output,
      network,
      experiment,
      control,
      markers,
      url
    } = flags;
    let { fidelity } = flags;

    if (typeof fidelity === 'string') {
      fidelity = parseInt((fidelityLookup as any)[fidelity], 10);
    }

    const delay = 100;
    const runtimeStats = true;
    const browser = {
      additionalArguments: browserArgs
    };

    const phaseTableConfig: Table.TableConstructorOptions = {
      colWidths: [30, 20, 20, 20, 20],
      head: [
        cHead('Phase'),
        cHead('Control p50'),
        cHead('Experiment p50'),
        cHead('Delta p50'),
        cHead('Significant')
      ],
      style: {
        head: [],
        border: []
      }
    };
    const phaseTable = new Table(phaseTableConfig) as Table.HorizontalTable;

    const benchmarks = {
      control: new InitialRenderBenchmark({
        browser,
        cpuThrottleRate,
        delay,
        markers,
        name: 'control',
        runtimeStats,
        saveTraces: () => `control-${output}-trace.json`,
        url
      }),
      experiment: new InitialRenderBenchmark({
        browser,
        delay,
        markers,
        name: 'experiment',
        runtimeStats,
        saveTraces: () => `experiment-${output}-trace.json`,
        url
      })
    };

    const runner = new Runner([benchmarks.control, benchmarks.experiment]);
    await runner
      .run(fidelity)
      .then(results => {
        if (!results[0].samples[0]) {
          this.error(`Could not sample from provided url: ${url}.`);
        }

        const message = {
          output: `Success! A detailed report and JSON file are available at ${output}.json`,
          ext: `${fidelity} test samples were run and the results are significant in ${
            results[0].meta.browserVersion
          }. A recommended high-fidelity analysis should be performed.`
        };

        fs.writeFileSync(`${output}.json`, JSON.stringify(results, null, 2));

        function getSample(id: string) {
          const o: any = {
            control: jsonQuery(`[*set=control][samples][**][*${id}]`, {
              data: results
            }).value,
            experiment: jsonQuery(`[*set=experiment][samples][**][*${id}]`, {
              data: results
            }).value,
            name: id
          };
          displayedStats.push(new StatDisplay(o));
        }

        getSample('duration');
        getSample('js');

        markers.forEach(marker => {
          const o: any = {
            control: jsonQuery(
              `[*set=control][samples][**][phases][*phase=${marker.start}]`,
              { data: results }
            ).value,
            experiment: jsonQuery(
              `[*set=experiment][samples][**][phases][*phase=${marker.start}]`,
              { data: results }
            ).value,
            name: marker
          };
          displayedStats.push(new StatDisplay(o));
        });

        // ITERATE OVER STAT DISPLAY ARRAY AND OUTPUT
        displayedStats.forEach(stat => {
          phaseTable.push([
            cPhase(`${stat.name}`),
            cNeutral(`${stat.controlQ}`),
            cNeutral(`${stat.experimentQ}`),
            cNeutral(`${stat.deltaQ}`),
            cNeutral(`${stat.isSignificant}`)
          ]);
        });

        // LOG JS, DURATION & PHASES AS SINGLE TABLE
        this.log(`\n\n${phaseTable.toString()}`);

        // LOG MESSAGE
        this.log(cNeutral(`\n\n${message.output}\n\n${message.ext}\n\n`));
      })
      .catch(err => {
        this.error(err);
      });
  }
}
