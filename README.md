# Fugl

A tool for verifying that changes to a package do not affect projects dependent upon it.

## Introduction

Most projects fortunate enough to see wider use end up with a tension between changes that
move things forward and consumers that depend on features and behaviours of existing versions.

Fugl intends to provide a way to address that question by providing automation around gaining
confidence that forward progress does not come at the expense of compatibility.

[Relevant discussion at npm](https://github.com/npm/npm/issues/6510).

## Install

```
npm install -g fugl
```

## Use

```
fugl --package <packageName>@<packageVersion> --projects https://github.com/someone/somepackage
```

By default, Fugl will output the success or failure of the tests it performs to the console. You
can also specify other reporters, and they correspond to the names of mocha reporters. Perhaps of
most interest is the HTML reporter, which will write a self contained breakage report that can be
viewed within the browser:

```
fugl --package unexpected --projects https://github.com/alexjeffburke/jest-unexpected --reporter html

// ...

open breakage/index.html
```

## Architecture

Internally Fugl is implemented as a [mocha](https://mochajs.org/)-esque test runner. As checks are
executued events are emitted which are passed into [reporters](https://mochajs.org/#reporters) that
generate output information. A default reporter is included twhich outputs to the console.

In the case of the HTML reporter, we use JSDOM as the output document and serialise a report on exit.

## Credits

This tool started began as a fork of [dont-break](https://github.com/bahmutov/dont-break.git) but the
drift of use-cases required a havy rewrite of the internal architecture and thus Fugl was born.

### Compabibility with dont-break

Some effort was made to continue to support users of `dont-break`. The project continues to ship with
a command line binary that should behave as a drop-in replacement with the only known exception being
[current module installation](https://github.com/bahmutov/dont-break#current-module-installation-method).
