# Hook<T extends any[]>

## Constructors

Instantiates a Hook.

## Instance Methods

### tap

Adds a callback to the hook.

* Arguments
  + `callback`
    - Type: `Function`
    - Arguments:
      + Type: `T`
* Returns
  + Type: `void`

### untap

Removes a callback from the Hook.

* Arguments
  + `callback`
    - Type: `Function`
    - Arguments:
      + Type: `T`
* Returns
  + Type: `void`

### clear

Removes all callbacks from the Hook.

* Returns
  + Type: `void`


### trigger

Triggers all callbacks from the Hook.

* Arguments
  * Type: `T`
* Returns
  + Type: `void`
