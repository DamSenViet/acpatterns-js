# HookSystem

An `interface` for the hooks used by an AcPattern.

# Properties

### type

Triggers internally when the pattern changes with the new pattern type.

* Type: [`Hook<PatternType>`](./Hook.md)

### palette

Triggers internally when the palette changes with the index that changed and the new color.

* Type: [`Hook<number, color>`](./Hook.md)

### load

Triggers internally when the patttern loads new data into it (assume everything changes).

* Type: [`Hook<[]>`](./Hook.md)

### refresh

Triggers externally by tools that make mass changes, used to refresh all pixels efficiently.

* Type: [`Hook<[]>`](./Hook.md)

