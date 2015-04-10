# RESTree (beta)
## An easy way to build an interface for your RESTful JSON API

RESTree was built with the intent of not recreating XMLHttpRequest’s objects
over and over again on your web application. You configure your RESTree only
once and use it everywhere.

Time to code!

## Adding your API root domain

On your HTML:

```html
<script src=”path/to/RESTree.js” type=”text/javascript”></script>
<script src=”path/to/myapi.js” type=”text/javascript”></script>
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
Suppose you have an endpoint **user** on a url like **user/{id}**, where
**id** is a parameter of the location:

```javascript
config.add(‘user’, ‘user/{id}’);
```
If the **location** equals **name** and has no parameters, there is no
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

```javascript
{
    “john”: [15, “male”],
    “mary”: [18, “female”],
    “lucas”: [3, “male”, “kid”]
}
```

You would like this data as:

```javascript
[
    [“john”, [15, “male”]],
    [“mary”, [18, “female”]],
    [“lucas”, [3, “male”, “kid”]]
]
```

RESTree solves it, but how? You may chain functions to transform your data
to the format you want. There are two pipelines, one for **in**coming data and one
to **out**going data. Go to the next section!

### Pipelining **in**coming data

*in(method, callback1[, callback2[, callback3[,...]]])*

The callback must be as follow:

```javascript
function callback(data) {
    // transformation...
    return tData;
}
```

Using the last example, we would solve the problem as follow:

```javascript
function toList(data) {
    var keys, tData;

    tData = [];
    keys = Object.keys(data);

    //Ugly right? I preffer this over ‘Array.forEach()’, but you may use what you want
    for (
        var i = 0, 
            length = keys.length, 
            key = keys[i];
        i < length;
        i++,
        key = keys[i]
    ) {
        tData.push([key, data[key]]);
    }

    return tData;
}

// code ...

config.people.in(‘get’, toList);
```

When you **get** from **people** endpoint, **data** will be passed to
**toList** method and will be transformed.

### Pipelining **out**going data

*out(method, callback1[, callback2[, callback3[,...]]])*

Works just like **in** method, but the transformations will be done
on request body instead of response data.

## Setting default Request Headers

*header(name, value)*

You may want to set default request headers to an endpoint, like
**authentication** headers:

```javascript
config.header(“Authentication”, “Bearer c21hcnQsIGFyZW4ndCB5b3U/”)
```

All sub nodes of a given node will have its parents headers.
The **json content-type** header is set by default.

## Getting and posting data (finally)

After all that configuration stage, it time to use your API!
But first, you must tell RESTree you are ready to go:

```javascript
var myapi = function () {
    var config = RESTree(“http://domain/api/root”);
    
    // All configuration code here ...

    return config.compile();
}();
```

You cannot add endpoints to the api from this point.
Time to make requests.

## Request

*request(method, query, data, success, fail)*

**method**: (string) **get**, **post**, **put** or **delete**

**query**: (key/value object) used to mount url parameters

> {reference: “week”, start: “2015-01-03”} => ?reference=week&start=2015-01-03

**data**: (key/value object) sent as JSON in request body

**success**: (function) if the request is successful (2XX status code), **success** is called with status code and response data.

**fail**: (function) if the request failed (4XX and 5XX status code), **fail** is called with status code and a possible response date (**in** pipeline not executed).

**somewhere on your code**
```javascript

    //Getting from user/{id} endpoint, and printing the data
    myapi.user({id: 99}).request(‘get’, null, null, function (status, data) {
        console.log(data);
    }, null);
```
