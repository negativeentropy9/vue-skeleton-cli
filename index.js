#!/usr/bin/env node

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const program = require('commander');
const util = require('util');
const createBundleRenderer = require('vue-server-renderer')
    .createBundleRenderer;
const colors = require('colors');
const isValid = require('is-valid-path');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const copyFile = util.promisify(fs.copyFile);
const ensureFile = util.promisify(fse.ensureFile);

const package = require('./package.json');
const webpackConfig = require('./lib/webpack.skeleton.conf');
const config = require('./config');

program
    .version('1.0.0', '-v, --version')
    .description('Tool of skeleton')
    .command('generate')
    .alias('g')
    .description('generate the skeleton template')
    .option('-s, --source <source>', 'assign the source of skeleton entry')
    .option('-t, --target <target>', 'assign the path of output skeleton html')
    .action(async function(options) {
        if (!isValid(options.source)) {
            console.error(colors.red(`option 'source': ${options.source} is not a path, eg: ./xxx.vue, please verify!`));

            throw new Error('options.source is not a path');
        }

        if (!isValid(options.target)) {
            console.error(colors.red(`option 'target': ${options.target} is not a path, eg: ./xxx.html, please verify!`));

            throw new Error('options.target is not a path');
        }

        const processPath = process.cwd();
        const sourceAbsolutePath = path.resolve(processPath, options.source);
        const targetAbsolutePath = path.resolve(processPath, options.target);
        const cliAbsolutePath = __dirname;
        const skeletonEntryAbsolutePath = require.resolve(
            './lib/skeleton.entry.js'
        );
        const SKELETON_ENTRY_RELATIVE_PATH = path
            .relative(skeletonEntryAbsolutePath, sourceAbsolutePath)
            .substr('../'.length);

        if (!config.copySkeletonTemplate) {
            const skeletonEntryTempalte = await readFile(
                require.resolve('./lib/skeletonEntryTemplate.js'),
                'utf-8'
            ).catch(err => {
                console.error(colors.red(
                    `${package.name} err: read ${require.resolve(
                        './lib/skeletonEntryTemplate.js'
                    )} ${err}`
                ));

                throw new Error(err);
            });

            await writeFile(
                require.resolve('./lib/skeleton.entry.js'),
                skeletonEntryTempalte.replace(
                    'SKELETON_ENTRY_RELATIVE_PATH',
                    `'${SKELETON_ENTRY_RELATIVE_PATH}'`
                )
            ).catch(err => {
                console.error(colors.red(
                    `${package.name} err: write ${require.resolve(
                        './lib/skeleton.entry.js'
                    )} ${err}`
                ));

                throw new Error(err);
            });

            console.info(colors.green(
                `${package.name} info: write skeleton entry successfully!`
            ));
        } else {
            await ensureFile(
                path.resolve(cliAbsolutePath, './lib/skeleton.vue')
            ).catch(err => {
                console.error(colors.red(`${package.name} err: ${err}`));

                throw new Error(err);
            });

            await copyFile(
                sourceAbsolutePath,
                require.resolve('./lib/skeleton.vue')
            ).catch(err => {
                console.error(colors.red(
                    `${
                        package.name
                    } err: copy from ${sourceAbsolutePath} to ${require.resolve(
                        './lib/skeleton.vue'
                    )} ${err}`
                ));

                throw new Error(err);
            });

            console.info(colors.green(
                `${package.name} info: copy skeleton template successfully!`
            ));
        }

        webpack(webpackConfig, (err, stats) => {
            if (err || stats.hasErrors()) {
                throw new Error(err || stats);
            }

            console.log(stats.toString({
              colors: true
            }));

            // 读取`skeleton.json`，以`index.html`为模板写入内容
            const renderer = createBundleRenderer(
                require.resolve('./lib/dist/skeleton.json'),
                {
                    template: fs.readFileSync(
                        require.resolve('./lib/index.html'),
                        'utf-8'
                    )
                }
            );

            // 把上一步模板完成的内容写入（替换）`index.html`
            renderer.renderToString({}, async (err, html) => {
                await writeFile(targetAbsolutePath, html, 'utf-8').catch((err) => {
                    console.error(colors.red(
                        `${package.name} err: generate skeleton ${err}`
                    ));

                    throw new Error(err);
                });

                console.info(colors.green(
                    `${package.name} info: generate skeleton successfully!\n`
                ));
                console.info(colors.green(
                    `click ${targetAbsolutePath} to preview\n`
                ));
            });
        });
    })
    .on('--help', function() {
        console.log('');
        console.log('Examples:');
        console.log('');
        console.log(
            '  $ skeleton-cli gn -s <source path of skeleton entry> -t <target path of output skeleton html>'
        );
    });

program.on('command:*', function() {
    console.error(colors.red(
        'Invalid command: %s\nSee --help for a list of available commands.',
        program.args.join(' ')
    ));
    process.exit(1);
});

program.parse(process.argv);

if (process.argv.length < 3) program.help();
