#!/usr/bin/env node

const yargs = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('build', 'build site', yargs => {
    yargs.option('s', {
      describe: 'site config or directory',
      default: process.cwd()
    })
    require('./build.js').build(yargs.argv)
  }).command('init', 'create new hatch project', yargs => {
    yargs.option('n', {
      describe: 'site name',
      default: process.cwd().slice(process.cwd().lastIndexOf(require('path').sep) + 1)
    })
  })
  .help('h')
  .alias('h', 'help')
  .argv

if(yargs._ == 0) console.log('To show help, pass the -h flag')
