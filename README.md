# RESTree (beta)
## An easy way to build an interface for your RESTful JSON API

RESTree was built with the intent of not recreating XMLHttpRequest’s objects
over and over again on your web application. You configure your RESTree only
once and use it everywhere.

Time to code!

## Adding your API root domain

On your HTML:

```html
<script src=”path/to/RESTree.js” type=”text/javascript”>
<script src=”path/to/myapi.js” type=”text/javascript”>
```
**myapi.js**
```javascript
var myapi = function () {
    var config = RESTree(“http://domain/api/root”);
}();
```

Easy, right?

## Adding endpoints

*add(name[, location])*

Each endpoint of your API is one node of the tree.
Suppose you have an endpoint **user** on a url like *user/{id}*, where
**id** is a parameter of the location:

```javascript
    config.add(‘user’, ‘user/{id}’);
```
If the location equals name and has no parameters, there is no
need to set it. You may also chain **add** method:

```javascript
config
    .add(‘user’, ‘user/{id}’)
    .add(‘images’);
```

### Adding sub endpoints

Suppose you want to add **images** endpoint to **user** endpoint:

```javascript
config.user
    .add(‘images’);
```

## Pipelining

Sometimes, the data you get from the API, is not on the format you would like it
to be. Suppose you want to iterate over the data you receive, but the API gives you
an object, not a list. Using **people** endpoint you get:

```json
{
    “john”: [15, “male”],
    “mary”: [18, “female”],
    “lucas”: [3, “male”, “kid”]
}
```

You would like this data as:

```json
[
    [“john”, [15, “male”]],
    [“mary”, [18, “female”]],
    [“lucas”, [3, “male”, “kid”]]
]
```

RESTree solves it, but how?

### Pipelining **in**coming data

*in(method, callback1[, callback2[, callback3[,...]]])*

The callback must be as follow:
```javascript
function callback(data) {
    // transformation...
    return data;
}
```
