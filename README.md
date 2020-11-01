# acpatterns-js

A JavaScript programming library to edit and preview Animal Crossing pattern files.

Based on our internal library at https://github.com/Thulinma/ACNLPatternTool/.


## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Contributors](#contributors)

## Installation

To install and use the library please choose one of the installation methods
listed below. Please note that [babylonjs](https://www.babylonjs.com/), the
rendering engine is required to use the modeler.

1. **NPM**

``` bash
# core library
npm install acpatterns
# if you need the modeler
npm install babylonjs@">=4.1.0" babylonjs-loaders@">=4.1.0"
```

2. **YARN**

``` bash
# core library
yarn add acpatterns
# if you need the modeler
yard add babylonjs@">=4.1.0" babylonjs-loaders@">=4.1.0"
```

3. **CDN**

``` html
<!-- if you need the modeler -->
<script src="https://unpkg.com/babylonjs@^4.1.0/babylon.js"></script>
<script src="https://unpkg.com/babylonjs-loaders@^4.1.0/babylonjs.loaders.min.js"></script>
<!-- core library -->
<script src="https://unpkg.com/acpatterns"></script>
```


## Quick Start

## Documentation

To view documentation, examples, or a playground demo, visit the [documentation site](https://damsenviet.github.io/acpatterns-js/).


## Contributors

Thanks goes out to my [acpatterns](https://acpatterns.com/) team for contributing solutions to this library.

- [MelonSpeedruns](https://twitter.com/MelonSpeedruns) - datamining the files
- [Thulinma](https://github.com/Thulinma) - reverse engineering the file formats
- [Myumi](https://github.com/myumi) - modifying the the qr-code library
- [Tero](https://tero.space/) - designing our graphical assets
- [daelsepara](https://github.com/daelsepara) - porting the pixel filter
